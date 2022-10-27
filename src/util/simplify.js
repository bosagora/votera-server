const stringify = require('fast-json-stable-stringify');

function searchEndBrace(query, pos) {
    let i;
    let openCount = 0;
    for (i = pos; i < query.length; i++) {
        let ch = query.charAt(i);
        if (ch === '{') {
            openCount++;
        } else if (ch === '}') {
            if (openCount > 0) {
                openCount--;
            } else {
                return i;
            }
        }
    }
    return -1;
}

function checkNextBrace(query, pos) {
    let i;
    for (i = pos; i < query.length; i++) {
        const ch = query.charAt(i);
        if (ch === '{') {
            return { pos: i, open: true };
        } else if (ch === '}') {
            return { pos: i, open: false };
        }
    }
    return { pos: -1 };
}

function simplifyQuery(query) {
    let pos, start, end;
    let result = [];

    if (!query) {
        return '';
    }

    query = query.trim();

    start = 0;
    pos = query.indexOf('{', start);
    if (pos < 0) {
        return query;
    }

    pos = query.indexOf('{', pos + 1);
    if (pos < 0) {
        return query;
    }

    for (;;) {
        end = searchEndBrace(query, pos + 1);
        if (end < 0) {
            result.push(query.substring(start));
            break;
        }

        result.push(`${query.substring(start, pos + 1)}}`);

        start = end + 1;
        const nextBrace = checkNextBrace(query, start);
        if (nextBrace.pos < 0) {
            result.push(query.substring(start));
            break;
        } else if (!nextBrace.open) {
            result.push(query.substring(start, nextBrace.pos + 1));
            break;
        }

        pos = nextBrace.pos;
    }

    return result.join('');
}

function simplifyVariable(variable) {
    // eslint-disable-next-line no-unused-vars
    const { file, files, ...rest } = variable;
    return stringify(rest);
}

module.exports = {
    simplifyQuery,
    simplifyVariable,
};
