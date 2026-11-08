// File-cache limits, not database scheduling. Cold misses never ask SQL.
export const RULES = { schema: 1, maxDocuments: 10000, maxDocumentChars: 1048576, maxIndexChars: 2097152, memoryChars: 8388608, maxDirty: 64 };
module.exports = RULES;
