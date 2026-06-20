import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_AGENT_PROFILES,
  loadAgentProfilesFromDir,
  loadAgentProfilesFromSources,
  resolveAgentProfiles,
  type SystemPromptContext,
} from '../../src/profile';
import { SessionSkillRegistry, type SkillDefinition } from '../../src/skill';

let workDir: string;

const promptContext: SystemPromptContext = {
  osEnv: {
    osKind: 'macOS',
    osArch: 'arm64',
    osVersion: '0',
    shellName: 'bash',
    shellPath: '/bin/bash',
  },
  cwd: '/workspace',
  now: '2026-05-09T00:00:00.000Z',
  cwdListing: 'README.md',
  agentsMd: 'Project instructions.',
  skills: 'Available test skills.',
};

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'kimi-agent-profile-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('agent profile loader', () => {
  it('loads YAML profiles, inherits templates, and renders with runtime context', async () => {
    const systemPath = await write(
      'system.md',
      [
        'os={{ KIMI_OS }}',
        'cwd={{ KIMI_WORK_DIR }}',
        'listing={{ KIMI_WORK_DIR_LS }}',
        'agents={{ KIMI_AGENTS_MD }}',
        'skills={{ KIMI_SKILLS }}',
        'parent={{ parentOnly }}',
        'child={{ childOnly }}',
        'role={{ ROLE_ADDITIONAL }}',
        '{% if KIMI_OS == "macOS" %}nunjucks-ok{% endif %}',
      ].join('\n'),
    );
    await write(
      'agent.yaml',
      `
name: agent
description: Parent agent
systemPromptPath: ./${fileName(systemPath)}
promptVars:
  parentOnly: parent-value
  roleAdditional: parent-role
tools:
  - Read
subagents:
  shared:
    description: Shared parent subagent
  coder:
    description: Coder child subagent
`,
    );
    await write(
      'coder.yaml',
      `
extends: agent
name: coder
promptVars:
  childOnly: child-value
  roleAdditional: child-role
tools:
  - Bash
`,
    );
    await write(
      'shared.yaml',
      `
name: shared
systemPromptTemplate: shared prompt
tools:
  - Read
`,
    );

    const profiles = await loadAgentProfilesFromDir([
      join(workDir, 'agent.yaml'),
      join(workDir, 'coder.yaml'),
      join(workDir, 'shared.yaml'),
      join(workDir, 'missing.yaml'),
    ]);
    const coderPrompt = profiles['coder']?.systemPrompt(promptContext);

    expect(profiles['coder']?.description).toBe('Coder child subagent');
    expect(profiles['coder']?.tools).toEqual(['Bash']);
    expect(profiles['agent']?.subagents?.['shared']).toBe(profiles['shared']);
    expect(profiles['agent']?.subagents?.['coder']).toBe(profiles['coder']);
    expect(profiles['coder']?.subagents).toBeUndefined();
    expect(profiles['shared']?.description).toBe('Shared parent subagent');
    expect(coderPrompt).toContain('os=macOS');
    expect(coderPrompt).toContain('cwd=/workspace');
    expect(coderPrompt).toContain('listing=README.md');
    expect(coderPrompt).toContain('agents=Project instructions.');
    expect(coderPrompt).toContain('skills=Available test skills.');
    expect(coderPrompt).toContain('parent=parent-value');
    expect(coderPrompt).toContain('child=child-value');
    expect(coderPrompt).toContain('role=child-role');
    expect(coderPrompt).toContain('nunjucks-ok');
    expect(coderPrompt).not.toContain('{{ ROLE_ADDITIONAL }}');
  });

  it('inherits and overrides modelAlias through extends', async () => {
    await write(
      'agent.yaml',
      `
name: agent
modelAlias: parent-model
tools:
  - Read
subagents:
  coder:
    description: Coder child subagent
`,
    );
    await write(
      'coder.yaml',
      `
extends: agent
name: coder
modelAlias: child-model
tools:
  - Bash
`,
    );
    await write(
      'explore.yaml',
      `
extends: agent
name: explore
tools:
  - Bash
`,
    );
    await write(
      'shared.yaml',
      `
name: shared
systemPromptTemplate: shared prompt
modelAlias: shared-model
tools:
  - Read
`,
    );

    const profiles = await loadAgentProfilesFromDir([
      join(workDir, 'agent.yaml'),
      join(workDir, 'coder.yaml'),
      join(workDir, 'explore.yaml'),
      join(workDir, 'shared.yaml'),
    ]);

    // Child profile overrides parent modelAlias
    expect(profiles['coder']?.modelAlias).toBe('child-model');
    // Child without modelAlias inherits from parent
    expect(profiles['explore']?.modelAlias).toBe('parent-model');
    // Standalone profile keeps its own modelAlias
    expect(profiles['shared']?.modelAlias).toBe('shared-model');
    // Parent subagent entry description is applied to the resolved target profile
    expect(profiles['coder']?.description).toBe('Coder child subagent');
  });

  it('copies modelAlias from parent subagent entry when target has none', async () => {
    await write(
      'parent.yaml',
      `\nname: parent\nsystemPromptTemplate: parent prompt\ntools:\n  - Read\nsubagents:\n  worker:\n    description: Worker subagent\n    modelAlias: subagent-entry-model\n`,
    );
    await write(
      'worker.yaml',
      `\nname: worker\nsystemPromptTemplate: worker prompt\ntools:\n  - Bash\n`,
    );

    const profiles = await loadAgentProfilesFromDir([
      join(workDir, 'parent.yaml'),
      join(workDir, 'worker.yaml'),
    ]);

    // The worker profile has no modelAlias, so the parent subagent entry's modelAlias is copied
    expect(profiles['worker']?.modelAlias).toBe('subagent-entry-model');
    expect(profiles['worker']?.description).toBe('Worker subagent');
  });

  it('inherits and overrides thinkingLevel through extends', async () => {
    await write(
      'agent.yaml',
      `
name: agent
thinkingLevel: max
tools:
  - Read
subagents:
  coder:
    description: Coder child subagent
`,
    );
    await write(
      'coder.yaml',
      `
extends: agent
name: coder
thinkingLevel: off
tools:
  - Bash
`,
    );
    await write(
      'explore.yaml',
      `
extends: agent
name: explore
tools:
  - Bash
`,
    );
    await write(
      'shared.yaml',
      `
name: shared
systemPromptTemplate: shared prompt
thinkingLevel: medium
tools:
  - Read
`,
    );

    const profiles = await loadAgentProfilesFromDir([
      join(workDir, 'agent.yaml'),
      join(workDir, 'coder.yaml'),
      join(workDir, 'explore.yaml'),
      join(workDir, 'shared.yaml'),
    ]);

    // Child profile overrides parent thinkingLevel
    expect(profiles['coder']?.thinkingLevel).toBe('off');
    // Child without thinkingLevel inherits from parent
    expect(profiles['explore']?.thinkingLevel).toBe('max');
    // Standalone profile keeps its own thinkingLevel
    expect(profiles['shared']?.thinkingLevel).toBe('medium');
  });

  it('copies thinkingLevel from parent subagent entry when target has none', async () => {
    await write(
      'parent.yaml',
      `\nname: parent\nsystemPromptTemplate: parent prompt\ntools:\n  - Read\nsubagents:\n  worker:\n    description: Worker subagent\n    thinkingLevel: low\n`,
    );
    await write(
      'worker.yaml',
      `\nname: worker\nsystemPromptTemplate: worker prompt\ntools:\n  - Bash\n`,
    );

    const profiles = await loadAgentProfilesFromDir([
      join(workDir, 'parent.yaml'),
      join(workDir, 'worker.yaml'),
    ]);

    // The worker profile has no thinkingLevel, so the parent subagent entry's thinkingLevel is copied
    expect(profiles['worker']?.thinkingLevel).toBe('low');
    expect(profiles['worker']?.description).toBe('Worker subagent');
  });

  it('reports invalid profile graphs without relying on loader internals', () => {
    expect(() =>
      resolveAgentProfiles([
        {
          name: 'agent',
          subagents: {
            missing: { description: 'Missing subagent' },
          },
        },
      ]),
    ).toThrow(/declares subagent "missing"/);

    expect(() => resolveAgentProfiles([{ name: 'agent' }, { name: 'agent' }])).toThrow(
      /Duplicate agent profile name: "agent"/,
    );

    expect(() =>
      resolveAgentProfiles([
        { name: 'agent', extends: 'coder' },
        { name: 'coder', extends: 'agent' },
      ]),
    ).toThrow(/agent -> coder -> agent/);
  });

  it('fails loudly when an embedded system prompt source is missing', () => {
    expect(() =>
      loadAgentProfilesFromSources(['profile/default/agent.yaml'], {
        'profile/default/agent.yaml': 'name: agent\nsystemPromptPath: ./missing.md\n',
      }),
    ).toThrow(/Embedded agent profile source missing: profile\/default\/missing\.md/);
  });
});

describe('default agent profiles', () => {
  it('links bundled subagents and keeps role-specific tool sets observable', () => {
    expect(DEFAULT_AGENT_PROFILES['agent']?.subagents?.['coder']).toBe(
      DEFAULT_AGENT_PROFILES['coder'],
    );
    expect(DEFAULT_AGENT_PROFILES['agent']?.subagents?.['explore']).toBe(
      DEFAULT_AGENT_PROFILES['explore'],
    );
    expect(DEFAULT_AGENT_PROFILES['agent']?.subagents?.['plan']).toBe(
      DEFAULT_AGENT_PROFILES['plan'],
    );

    expect(DEFAULT_AGENT_PROFILES['agent']?.tools).toEqual(
      expect.arrayContaining([
        'Read',
        'Write',
        'Edit',
        'Bash',
        'Agent',
        'Skill',
        'TaskList',
        'TaskOutput',
        'TaskStop',
      ]),
    );
    expect(DEFAULT_AGENT_PROFILES['coder']?.tools).toEqual(
      expect.arrayContaining(['Read', 'Write', 'Edit', 'Bash']),
    );
    expect(DEFAULT_AGENT_PROFILES['explore']?.tools).not.toContain('Write');
    expect(DEFAULT_AGENT_PROFILES['plan']?.tools).not.toContain('Bash');
  });

  it('renders the model-invocable skill listing for bundled prompts', () => {
    const skills = new SessionSkillRegistry();
    skills.register(skill('review', { whenToUse: 'When code review is requested.' }));
    skills.register({
      ...skill('nested-review', {
        isSubSkill: true,
        whenToUse: 'When nested review is requested.',
      }),
      path: '/skills/parent/nested-review/SKILL.md',
      dir: '/skills/parent/nested-review',
      content: 'Nested review body must not enter system prompt.',
    });
    skills.register(skill('private', { disableModelInvocation: true }));
    skills.register(skill('flow-only', { type: 'flow' }));

    const prompt = DEFAULT_AGENT_PROFILES['agent']?.systemPrompt({
      ...promptContext,
      skills,
    });

    expect(prompt).toContain('Current available skills:');
    expect(prompt).toContain('- review:');
    expect(prompt).toContain('When to use: When code review is requested.');
    expect(prompt).not.toContain('- nested-review:');
    expect(prompt).not.toContain('Path: /skills/parent/nested-review/SKILL.md');
    expect(prompt).not.toContain('When to use: When nested review is requested.');
    expect(prompt).not.toContain('private');
    expect(prompt).not.toContain('flow-only');
    expect(prompt).not.toContain('body of review');
    expect(prompt).not.toContain('Nested review body must not enter system prompt.');
  });

  it('renders the bundled default prompt from the current runtime context', () => {
    const first = DEFAULT_AGENT_PROFILES['agent']?.systemPrompt({
      ...promptContext,
      cwd: '/workspace/one',
    });
    const second = DEFAULT_AGENT_PROFILES['agent']?.systemPrompt({
      ...promptContext,
      cwd: '/workspace/two',
    });

    expect(first).toContain('You are Kimi Code CLI');
    expect(first).toContain('Available skills');
    expect(first).toContain('/workspace/one');
    expect(second).toContain('/workspace/two');
    expect(second).not.toContain('/workspace/one');
  });
});

async function write(fileName: string, content: string): Promise<string> {
  const filePath = join(workDir, fileName);
  await writeFile(filePath, content.trimStart(), 'utf-8');
  return filePath;
}

function fileName(filePath: string): string {
  return filePath.slice(workDir.length + 1);
}

function skill(name: string, metadata: SkillDefinition['metadata'] = {}): SkillDefinition {
  return {
    name,
    description: `desc for ${name}`,
    path: `/skills/${name}/SKILL.md`,
    dir: `/skills/${name}`,
    content: `body of ${name}`,
    metadata,
    source: 'user',
  };
}
