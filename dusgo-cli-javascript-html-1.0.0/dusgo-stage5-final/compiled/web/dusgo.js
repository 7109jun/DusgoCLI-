(() => {
  'use strict';

  const COMPONENTS = ['Coding', 'Object', 'Sound', 'Image', 'Scene'];
  const LIMITS = { image: 5 * 1024 * 1024, object: 5 * 1024 * 1024, shape: 5 * 1024 * 1024, sound: 10 * 1024 * 1024 };
  const IMAGE_EXT = ['.jpg', '.png', '.bmp', '.svg', '.eo'];

  const state = {
    project: { name: 'Untitled', version: '1', files: new Map(), scenes: [] },
    history: [],
    git: { initialized: false, staged: new Set(), commits: [] }
  };

  const $ = (sel) => document.querySelector(sel);
  const terminal = $('#terminal');
  const input = $('#command');
  const code = $('#coding');
  const projectName = $('#projectName');

  function print(text = '') {
    terminal.textContent += text + '\n';
    terminal.scrollTop = terminal.scrollHeight;
  }

  function error(text) { print(`[ERROR] ${text}`); }

  function tokenize(text) {
    const out = [];
    const re = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g;
    for (const match of text.matchAll(re)) out.push(match[0]);
    return out;
  }

  function checkCoding(source) {
    const lines = source.replace(/\r/g, '').split('\n').filter((line) => line.trim() !== '');
    if (!lines.length) throw new Error('Coding이 비어 있습니다.');
    if (/\t/.test(source)) throw new Error('탭 들여쓰기는 사용할 수 없습니다. 공백만 사용하세요.');

    const nodes = lines.map((raw, i) => {
      const match = /^( *)(.*)$/.exec(raw);
      const indent = match[1].length;
      const text = match[2].trim();
      return { line: i + 1, indent, text };
    });

    if (nodes[0].indent !== 0 || !/^when\s+program\.start$/.test(nodes[0].text)) {
      throw new Error('Coding의 첫 번째 블록은 반드시 when program.start 이어야 합니다.');
    }

    for (let i = 1; i < nodes.length; i++) {
      const n = nodes[i];
      const prev = nodes[i - 1];
      if (n.indent < 1) throw new Error(`Coding:${n.line}: 시작 블록 외 블록은 반드시 1칸 이상 들여써야 합니다.`);
      if (n.indent - prev.indent > 1) throw new Error(`Coding:${n.line}: 들여쓰기는 한 단계당 정확히 1칸씩 증가해야 합니다.`);
      validateStatement(n.text, n.line);
    }
    return nodes;
  }

  function validateStatement(text, line) {
    if (/^move\([-+]?\d+(?:\.\d+)?\)$/.test(text)) return;
    if (/^wait\(\d+(?:\.\d+)?\)$/.test(text)) return;
    if (/^say\("(?:\\.|[^"\\])*"\)$/.test(text)) return;
    if (/^turn\([-+]?\d+(?:\.\d+)?\)$/.test(text)) return;
    if (/^repeat\(\d+\)$/.test(text)) return;
    if (text === 'hide()' || text === 'show()') return;
    throw new Error(`Coding:${line}: 지원하지 않는 블록 문법: ${text}`);
  }

  function createProject(name) {
    state.project = { name: name || 'Untitled', version: '1', files: new Map(), scenes: [] };
    state.project.files.set('Coding/main.du', 'when program.start\n move(10)\n');
    state.project.scenes.push('Scene 1');
    state.git = { initialized: false, staged: new Set(), commits: [] };
    projectName.value = state.project.name;
    code.value = state.project.files.get('Coding/main.du');
    refreshTree();
    print(`Project 생성 완료: ${state.project.name}`);
  }

  function addFile(component, fileName, data, size) {
    state.project.files.set(`${component}/${fileName}`, data);
    print(`${component} 추가 완료: ${fileName} (${formatBytes(size)})`);
    refreshTree();
  }

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 ** 2).toFixed(2)} MB`;
  }

  function refreshTree() {
    const tree = $('#tree');
    tree.innerHTML = '';
    for (const group of COMPONENTS) {
      const files = [...state.project.files.keys()].filter((p) => p.startsWith(`${group}/`));
      const section = document.createElement('div');
      section.className = 'group';
      section.innerHTML = `<strong>${group}</strong>`;
      files.sort().forEach((f) => {
        const item = document.createElement('button');
        item.className = 'file';
        item.textContent = f.slice(group.length + 1);
        item.onclick = () => {
          if (group === 'Coding') {
            code.value = state.project.files.get(f) || '';
          }
          print(`열기: ${f}`);
        };
        section.appendChild(item);
      });
      if (!files.length) {
        const empty = document.createElement('span');
        empty.className = 'empty';
        empty.textContent = '(empty)';
        section.appendChild(empty);
      }
      tree.appendChild(section);
    }
  }

  function syncCode() {
    try {
      const nodes = checkCoding(code.value);
      state.project.files.set('Coding/main.du', code.value.endsWith('\n') ? code.value : code.value + '\n');
      print(`[OK] Coding 검사 통과 — blocks=${nodes.length}`);
      refreshTree();
      return true;
    } catch (e) {
      error(e.message || String(e));
      return false;
    }
  }

  function saveProject() {
    state.project.name = projectName.value.trim() || 'Untitled';
    syncCode();
    localStorage.setItem('dusgo-project', JSON.stringify({
      name: state.project.name,
      version: state.project.version,
      files: Object.fromEntries(state.project.files),
      scenes: state.project.scenes,
      git: { initialized: state.git.initialized, commits: state.git.commits }
    }));
    print('[OK] Project 저장 완료');
  }

  function loadProject() {
    const raw = localStorage.getItem('dusgo-project');
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      state.project = { name: data.name || 'Untitled', version: data.version || '1', files: new Map(Object.entries(data.files || {})), scenes: data.scenes || [] };
      state.git = { initialized: Boolean(data.git?.initialized), staged: new Set(), commits: data.git?.commits || [] };
      projectName.value = state.project.name;
      code.value = state.project.files.get('Coding/main.du') || '';
      refreshTree();
      return true;
    } catch { return false; }
  }

  function runEntrySimulation() {
    if (!syncCode()) return;
    print('[Entry] 프로젝트 실행 시작');
    const source = code.value;
    const nodes = checkCoding(source);
    nodes.slice(1).forEach((n) => print(`[Entry] line ${n.line}: ${n.text}`));
    print('[Entry] 실행 완료');
  }

  function gitCommand(args) {
    const sub = args[0] || 'status';
    if (sub === 'init') { state.git.initialized = true; print('Git 저장소 초기화 완료'); return; }
    if (!state.git.initialized) throw new Error('먼저 git init을 실행하세요.');
    const tracked = (p) => COMPONENTS.some((x) => p.startsWith(`${x}/`));
    if (sub === 'status') {
      print(`On dusgo/${state.project.name}`);
      print(`Changes: ${[...state.project.files.keys()].filter(tracked).length} component files`);
      print(`Staged: ${state.git.staged.size}`);
      return;
    }
    if (sub === 'add') {
      const targets = args.slice(1);
      if (!targets.length || targets.includes('.')) {
        state.git.staged = new Set([...state.project.files.keys()].filter(tracked));
      } else {
        for (const target of targets) for (const p of state.project.files.keys()) if (p === target || p.startsWith(`${target}/`)) state.git.staged.add(p);
      }
      print(`stage: ${[...state.git.staged].join(' ')}`);
      return;
    }
    if (sub === 'commit') {
      const idx = args.indexOf('-m');
      if (idx < 0 || !args[idx + 1]) throw new Error('사용법: git commit -m <message>');
      state.git.commits.push({ message: args.slice(idx + 1).join(' '), files: [...state.git.staged], time: new Date().toISOString() });
      state.git.staged.clear();
      print(`[main] commit: ${state.git.commits.at(-1).message}`);
      return;
    }
    if (sub === 'log') {
      [...state.git.commits].reverse().forEach((c, i) => print(`${String(i + 1).padStart(2, '0')}  ${c.message}`));
      if (!state.git.commits.length) print('(no commits)');
      return;
    }
    print(`git ${sub}: browser version에서는 로컬 저장소 대신 Project 기록을 사용합니다.`);
  }

  async function runCommand(line) {
    const args = tokenize(line.trim());
    if (!args.length) return;
    const cmd = args.shift();
    try {
      switch (cmd) {
        case 'help':
          print('init <name> | files | check | entry run | entry debug | entry test | image add | shape add | object add | sound add | scene add | git init/status/add/commit/log | web open | community open');
          break;
        case 'clear': terminal.textContent = ''; break;
        case 'version': print('둣교 CLI 1.0.0 (JavaScript/HTML)'); break;
        case 'init': createProject(args.join(' ') || 'Untitled'); break;
        case 'files': [...state.project.files.keys()].sort().forEach(print); break;
        case 'check': syncCode(); break;
        case 'save': saveProject(); break;
        case 'entry':
          if (args[0] === 'run' || args[0] === 'debug' || args[0] === 'test') runEntrySimulation();
          else print('entry create / wait / inspect / sync / run / debug / test / stop');
          break;
        case 'git': gitCommand(args); break;
        case 'web':
          if (args[0] === 'open') window.open(args[1] || 'https://playentry.org/', '_blank', 'noopener');
          else print(`web status: ${location.protocol}//${location.host}`);
          break;
        case 'community':
          window.open(args[0] === 'search' ? `https://playentry.org/project/list/all?query=${encodeURIComponent(args.slice(1).join(' '))}` : 'https://playentry.org/community', '_blank', 'noopener');
          break;
        default: throw new Error(`알 수 없는 명령: ${cmd}`);
      }
    } catch (e) { error(e.message || String(e)); }
  }

  $('#run').onclick = () => runCommand('entry run');
  $('#check').onclick = () => runCommand('check');
  $('#save').onclick = saveProject;
  $('#entry').onclick = () => window.open('https://playentry.org/', '_blank', 'noopener');
  $('#newProject').onclick = () => createProject('Untitled');

  $('#assetInput').addEventListener('change', (event) => {
    [...event.target.files].forEach((file) => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const kind = ext === '.mp3' ? 'Sound' : (ext === '.eo' ? 'Object' : 'Image');
      const limit = ext === '.mp3' ? LIMITS.sound : LIMITS.image;
      if (!IMAGE_EXT.includes(ext) && ext !== '.mp3') return error(`지원하지 않는 파일: ${file.name}`);
      if (file.size > limit) return error(`${file.name}: 크기 제한 초과 (${formatBytes(limit)} 이하)`);
      const reader = new FileReader();
      reader.onload = () => addFile(kind, file.name, reader.result, file.size);
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  });

  input.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    const value = input.value.trim();
    if (!value) return;
    print(`둣교> ${value}`);
    state.history.push(value);
    input.value = '';
    await runCommand(value);
  });

  code.addEventListener('input', () => {
    state.project.files.set('Coding/main.du', code.value);
  });

  if (!loadProject()) createProject('Untitled');
  print('둣교 CLI 1.0.0 — JavaScript/HTML');
  print('실행: entry run    검사: check    도움말: help');
})();
