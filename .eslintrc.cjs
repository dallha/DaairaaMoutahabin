module.exports = {
  plugins: ["@firebase/eslint-plugin-security-rules"],
  rules: {
    "@firebase/security-rules/no-ambiguous-reads": "error",
    "@firebase/security-rules/no-unprotected-reads": "error",
    "@firebase/security-rules/no-unprotected-writes": "error"
  }
};
