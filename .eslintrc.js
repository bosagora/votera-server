module.exports = {
    parser: '@babel/eslint-parser',
    extends: ['prettier', 'eslint:recommended', 'plugin:prettier/recommended'],
    env: {
        commonjs: true,
        es6: true,
        node: true,
        browser: false,
        jest: true,
    },
    parserOptions: {
        ecmaFeatures: {
            experimentalObjectRestSpread: true,
            jsx: false,
        },
        sourceType: 'module',
        requireConfigFile: false,
    },
    plugins: ['@babel', 'prettier'],
    globals: {
        strapi: true,
    },
    rules: {
        indent: ['error', 4, { SwitchCase: 1 }],
        'linebreak-style': ['error', 'unix'],
        'no-console': 0,
        quotes: ['error', 'single'],
        semi: ['error', 'always'],
    },
};
