const diff = require('diff');

// Create a diff between two text strings
const createDiff = (oldText, newText) => {
  if (!oldText) oldText = '';
  if (!newText) newText = '';
  
  const changes = diff.diffLines(oldText, newText);
  
  // Format diff for storage and display
  const formattedDiff = changes.map(part => {
    const prefix = part.added ? '+' : part.removed ? '-' : ' ';
    return part.value.split('\n')
      .filter(line => line !== '')
      .map(line => `${prefix} ${line}`)
      .join('\n');
  }).join('\n');
  
  return formattedDiff;
};

// Create a detailed diff with line numbers
const createDetailedDiff = (oldText, newText) => {
  const changes = diff.diffLines(oldText, newText);
  const result = {
    additions: 0,
    deletions: 0,
    changes: []
  };
  
  let oldLineNum = 1;
  let newLineNum = 1;
  
  changes.forEach(part => {
    const lines = part.value.split('\n').filter(line => line !== '');
    
    if (part.added) {
      result.additions += lines.length;
      lines.forEach(line => {
        result.changes.push({
          type: 'add',
          lineNum: newLineNum++,
          content: line
        });
      });
    } else if (part.removed) {
      result.deletions += lines.length;
      lines.forEach(line => {
        result.changes.push({
          type: 'remove',
          lineNum: oldLineNum++,
          content: line
        });
      });
    } else {
      lines.forEach(line => {
        result.changes.push({
          type: 'unchanged',
          oldLineNum: oldLineNum++,
          newLineNum: newLineNum++,
          content: line
        });
      });
    }
  });
  
  return result;
};

// Apply a diff patch to text
const applyDiff = (originalText, diffPatch) => {
  // This is a simplified implementation
  // In production, you might want to use a more robust patching algorithm
  const lines = diffPatch.split('\n');
  const result = [];
  
  lines.forEach(line => {
    if (line.startsWith('+ ')) {
      result.push(line.substring(2));
    } else if (!line.startsWith('- ')) {
      result.push(line.substring(2));
    }
  });
  
  return result.join('\n');
};

// Compare two versions and generate a summary
const compareVersions = (version1, version2) => {
  const diff = createDetailedDiff(version1.content_markdown, version2.content_markdown);
  
  return {
    version1: {
      version: version1.version_number,
      author: version1.author_name,
      date: version1.created_at
    },
    version2: {
      version: version2.version_number,
      author: version2.author_name,
      date: version2.created_at
    },
    statistics: {
      additions: diff.additions,
      deletions: diff.deletions,
      totalChanges: diff.additions + diff.deletions
    },
    changes: diff.changes
  };
};

module.exports = {
  createDiff,
  createDetailedDiff,
  applyDiff,
  compareVersions
};