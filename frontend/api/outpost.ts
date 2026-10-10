import { createOutpostHandler } from '../server/outpost.ts';
export const config = { maxDuration: 60 };
export default createOutpostHandler(process.env);
