const PREFIX = 'connection.';


function base64(i) {
  return ((new Buffer(i, 'ascii')).toString('base64'));
}


function unbase64(i) {
  return ((new Buffer(i, 'base64')).toString('ascii'));
}


/**
 * Creates the cursor string from an offset.
 */
export function idToCursor(mongoId) {
  return base64(PREFIX + mongoId);
}


/**
 * Rederives the offset from the cursor string.
 */
export function cursorToId(cursor) {
  return unbase64(cursor).substring(PREFIX.length);
}
