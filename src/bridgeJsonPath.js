function assertObjectTarget(target) {
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    throw new Error('setByPath target 必須是物件。');
  }
}

function parsePath(path) {
  const normalizedPath = String(path ?? '').trim();

  if (!normalizedPath) {
    throw new Error('setByPath path 不可為空。');
  }

  const segments = normalizedPath.split('.');

  if (segments.some((segment) => !segment)) {
    throw new Error(`setByPath path 格式無效：${normalizedPath}`);
  }

  return segments;
}

function setByPath(target, path, value) {
  assertObjectTarget(target);
  const segments = parsePath(path);

  let current = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nextValue = current[segment];

    if (nextValue == null) {
      current[segment] = {};
    } else if (typeof nextValue !== 'object' || Array.isArray(nextValue)) {
      throw new Error(`setByPath 無法覆寫非物件節點：${segments.slice(0, index + 1).join('.')}`);
    }

    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;

  return target;
}

export {
  setByPath,
};
