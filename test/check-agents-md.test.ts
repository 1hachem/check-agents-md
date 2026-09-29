import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
	addedLines,
	blocksOf,
	fails,
	includesOf,
	type Judged,
	loadConfig,
	parseArgv,
	refsOf,
	resolve,
	spansOf,
	tasksIn,
	warns,
	type World,
} from '../src/check-agents-md.ts';

const fixture = (name: string): string =>
	readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8');

const all = () => true;

const world = (over: Partial<World> = {}): World => ({
	tracked: ['scripts/check-agents.ts'],
	scripts: new Set(['check:refs']),
	tasks: new Set(['check:agents']),
	names: (needle) => needle === 'parseArgv',
	exists: (path) => path === 'scripts/check-agents.ts',
	...over,
});

const judged = (over: Partial<Judged>): Judged => ({
	file: 'AGENTS.md',
	line: 1,
	section: '',
	paragraph: '',
	added: '',
	root: true,
	implementation: 0,
	confidence: 1,
	mechanism: 0,
	symbols: 0,
	rationale: 0,
	mass: 0,
	kind: 'rule',
	implicated: 0,
	scope: 0,
	...over,
});

test('blocks: one per paragraph, carrying its section', () => {
	const blocks = blocksOf(fixture('agents.md'), 'AGENTS.md', all);
	assert.deepEqual(
		blocks.map((b) => [b.line, b.section]),
		[
			[3, 'Agents'],
			[7, 'Layout'],
			[16, 'Runtime'],
		],
	);
});

test('blocks: a fenced example is not prose', () => {
	const blocks = blocksOf(fixture('agents.md'), 'AGENTS.md', all);
	assert.ok(blocks.every((b) => !b.paragraph.includes('task check:agents')));
});

test('blocks: a paragraph is judged whole, but records only what changed', () => {
	const blocks = blocksOf(fixture('agents.md'), 'AGENTS.md', (line) => line === 8);
	assert.equal(blocks.length, 1);
	assert.equal(blocks[0]?.line, 8);
	assert.equal(blocks[0]?.added, 'import from another app.');
	assert.ok(blocks[0]?.paragraph.startsWith('The `packages/ui`'));
});

test('blocks: a nested AGENTS.md is not the root one', () => {
	const [block] = blocksOf(fixture('agents.md'), 'packages/ui/AGENTS.md', all);
	assert.equal(block?.root, false);
});

test('added lines: taken from the hunk headers, not the counts', () => {
	const patch = [
		'--- a/AGENTS.md',
		'+++ b/AGENTS.md',
		'@@ -4,0 +5,2 @@',
		'+first',
		'+second',
		'@@ -9 +11 @@',
		'-old',
		'+new',
		'',
	].join('\n');
	assert.deepEqual([...addedLines(patch)], [5, 6, 11]);
});

test('spans: backticked tokens outside fences', () => {
	const spans = spansOf(fixture('refs.md'), 'AGENTS.md', all);
	assert.deepEqual(
		spans.map((s) => s.token),
		['scripts/check-agents.ts', 'pnpm check:refs', 'parseArgv', 'task check:agents', 'docs/missing.md'],
	);
});

test('refs: a path, a script, a task and an identifier are told apart', () => {
	const refs = spansOf(fixture('refs.md'), 'AGENTS.md', all).flatMap(refsOf);
	assert.deepEqual(
		refs.map((r) => [r.kind, r.needle, r.namespace]),
		[
			['path', 'scripts/check-agents.ts', ''],
			['command', 'check:refs', 'script'],
			['identifier', 'parseArgv', ''],
			['command', 'check:agents', 'task'],
			['path', 'docs/missing.md', ''],
		],
	);
});

test('refs: prose without backticks names nothing', () => {
	assert.deepEqual(spansOf('A resolver that must not exist.', 'AGENTS.md', all), []);
});

test('refs: placeholders, globs and shell variables are not references', () => {
	const tokens = ['<name>', 'src/*.ts', 'FOO=bar', '@scope/pkg', '--flag', 'API_KEY', 'node:fs'];
	for (const token of tokens) {
		assert.deepEqual(refsOf({ file: 'AGENTS.md', line: 1, token }), [], token);
	}
});

test('refs: `turbo run` and `npm run` name the script, not the verb', () => {
	for (const token of ['turbo run build', 'npm run build']) {
		const [ref] = refsOf({ file: 'AGENTS.md', line: 1, token });
		assert.equal(ref?.needle, 'build', token);
	}
});

test('resolve: what the repo still carries passes', () => {
	const refs = spansOf(fixture('refs.md'), 'AGENTS.md', all).flatMap(refsOf);
	const dead = refs.filter((ref) => resolve(ref, world()).length > 0);
	assert.deepEqual(
		dead.map((r) => r.token),
		['docs/missing.md'],
	);
});

test('resolve: a task named as a script is not the same target', () => {
	const ref = { file: 'AGENTS.md', line: 1, token: 'check:agents', kind: 'command' as const, needle: 'check:agents', namespace: 'script' as const };
	assert.deepEqual(resolve(ref, world()), ['no package.json declares the script']);
});

test('resolve: a bare name resolves against either namespace', () => {
	const ref = { file: 'AGENTS.md', line: 1, token: 'check:agents', kind: 'command' as const, needle: 'check:agents', namespace: 'either' as const };
	assert.deepEqual(resolve(ref, world()), []);
});

test('resolve: a path is tried next to the file that names it', () => {
	const ref = { file: 'packages/ui/AGENTS.md', line: 1, token: 'src/index.ts', kind: 'path' as const, needle: 'src/index.ts', namespace: '' as const };
	const known = world({ exists: (p) => p === 'packages/ui/src/index.ts' });
	assert.deepEqual(resolve(ref, known), []);
});

test('resolve: a missing path under a package says where it looked', () => {
	const ref = { file: 'packages/ui/AGENTS.md', line: 1, token: 'src/gone.ts', kind: 'path' as const, needle: 'src/gone.ts', namespace: '' as const };
	const tried = resolve(ref, world({ tracked: [], exists: () => false }));
	assert.match(tried[0] ?? '', /packages\/ui\/src\/gone\.ts/);
});

test('taskfile: tasks, aliases and included namespaces are all targets', () => {
	const names = new Set<string>();
	tasksIn(
		['tasks:', '  agents:', '    cmd: echo', '  refs:', '    aliases:', '      - references', '    cmd: echo'].join('\n'),
		'check:',
		names,
	);
	assert.deepEqual([...names].sort(), ['check:agents', 'check:references', 'check:refs']);
});

test('taskfile: an included taskfile carries its own prefix unless flattened', () => {
	const found = includesOf(
		'Taskfile.yml',
		['includes:', '  check: ./taskfiles/check.yml', '  ci:', '    taskfile: ./taskfiles/ci.yml', '    flatten: true', 'tasks:'].join('\n').split('\n'),
		'',
	);
	assert.deepEqual(found, [
		{ path: 'taskfiles/check.yml', prefix: 'check:' },
		{ path: 'taskfiles/ci.yml', prefix: '' },
	]);
});

test('verdict: a near-certain mechanism fails whatever it was classed as', () => {
	assert.equal(fails(judged({ mechanism: 0.9, implicated: 0.1, mass: 0.1 })), true);
});

test('verdict: a pointer with a little implementation mass does not fail', () => {
	assert.equal(fails(judged({ mass: 0.9, implicated: 0.2 })), false);
});

test('verdict: implementation mass fails once the kind agrees', () => {
	assert.equal(fails(judged({ mass: 0.85, implicated: 0.6 })), true);
});

test('verdict: a named identifier warns without failing', () => {
	const one = judged({ symbols: 0.8 });
	assert.equal(fails(one), false);
	assert.equal(warns(one), true);
});

test('verdict: a repository-wide rule in the root file passes clean', () => {
	const one = judged({ kind: 'rule' });
	assert.equal(fails(one), false);
	assert.equal(warns(one), false);
});

test('argv: booleans need no value and take a --no- form', () => {
	const flags = parseArgv(['--all', '--no-fail-on-violations', '--jobs=8']);
	assert.deepEqual(flags.get('all'), ['true']);
	assert.deepEqual(flags.get('fail-on-violations'), ['false']);
	assert.deepEqual(flags.get('jobs'), ['8']);
});

test('argv: --ignore repeats', () => {
	assert.deepEqual(parseArgv(['--ignore', '^vendor/', '--ignore', '^docs/']).get('ignore'), [
		'^vendor/',
		'^docs/',
	]);
});

test('argv: a bare argument is an error', () => {
	assert.throws(() => parseArgv(['AGENTS.md']), /Unexpected argument/);
});

test('config: check-agents-md.json wins over the package.json key', () => {
	const dir = mkdtempSync(join(tmpdir(), 'check-agents-md-'));
	const cwd = process.cwd();
	try {
		process.chdir(dir);
		writeFileSync('package.json', JSON.stringify({ 'check-agents-md': { checks: 'refs' } }));
		assert.deepEqual(loadConfig(), { checks: 'refs' });
		writeFileSync('check-agents-md.json', JSON.stringify({ checks: ['rules'] }));
		assert.deepEqual(loadConfig(), { checks: ['rules'] });
	} finally {
		process.chdir(cwd);
		rmSync(dir, { recursive: true, force: true });
	}
});
