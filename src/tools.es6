'use strict';

import { createHmac } from 'crypto';

export const signBlob = (key, blob) => {
  return 'sha1=' + createHmac('sha1', key).update(blob).digest('hex');
};
