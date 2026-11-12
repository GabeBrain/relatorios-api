import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:Number(process.argv[2]),strictPort:true,watch:{ignored:['**/.local-inputs/**']}}});
await server.listen();
