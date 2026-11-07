export function run(job, args) {
  const keys = []; for (const k in job) keys.push(k);
  return { keys, own: Object.getOwnPropertyNames(job), proto: Object.getOwnPropertyNames(Object.getPrototypeOf(job) || {}), hasFetch: typeof fetch };
}
