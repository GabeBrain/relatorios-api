import { createCagedReportHandler } from './handler.ts';
Deno.serve(createCagedReportHandler({env:key=>Deno.env.get(key)}));
