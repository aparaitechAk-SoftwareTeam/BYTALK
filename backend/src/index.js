import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = path.join(root, 'data', 'store.json');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const seed = {
  users: [
    {id:'u1', name:'Pavan Nerkar', country:'India', nativeLanguage:'Hindi', learningLanguage:'English', level:'Intermediate', online:true, streak:12, minutes:150, words:28},
    {id:'u2', name:'Yuki', country:'Japan', nativeLanguage:'Japanese', learningLanguage:'English', level:'Intermediate', online:true},
    {id:'u3', name:'Lucas', country:'Brazil', nativeLanguage:'Portuguese', learningLanguage:'English', level:'Beginner', online:true},
    {id:'u4', name:'Minji', country:'South Korea', nativeLanguage:'Korean', learningLanguage:'English', level:'Intermediate', online:true},
    {id:'u5', name:'Carlos', country:'Mexico', nativeLanguage:'Spanish', learningLanguage:'English', level:'Intermediate', online:true},
    {id:'u6', name:'Aditi', country:'India', nativeLanguage:'Hindi', learningLanguage:'English', level:'Beginner', online:true}
  ],
  rooms: [
    {id:'r1', name:'Everyday English', topic:'English', level:'Beginner - Intermediate', listeners:24, joined:0},
    {id:'r2', name:'Travel stories', topic:'Travel', level:'Intermediate - Advanced', listeners:18, joined:0},
    {id:'r3', name:'Movies & culture', topic:'Culture', level:'All levels', listeners:32, joined:0},
    {id:'r4', name:'Language exchange', topic:'Study', level:'Beginner - Intermediate', listeners:12, joined:0}
  ], messages:[
    {id:'m1',from:'u2',to:'u1',text:'Hi Pavan! 👋 How is your day going?',at:new Date().toISOString()},
    {id:'m2',from:'u1',to:'u2',text:'Hi! My day is good. I am learning English!',at:new Date().toISOString()}
  ], vocabulary:[{id:'v1',userId:'u1',word:'conversation',category:'Conversation'}],reports:[]
};
let store;
try { store = JSON.parse(fs.readFileSync(dbFile,'utf8')); } catch { store = seed; fs.writeFileSync(dbFile,JSON.stringify(store,null,2)); }
const save = () => fs.writeFileSync(dbFile,JSON.stringify(store,null,2));
const app=express(); app.use(cors());app.use(express.json({limit:'128kb'}));
const httpServer=createServer(app); const io=new Server(httpServer,{cors:{origin:'*'}});
app.get('/api/health',(req,res)=>res.json({ok:true,service:'BYTALK API'}));
app.get('/api/users',(req,res)=>res.json(store.users));
app.get('/api/partners',(req,res)=>{const q=String(req.query.q||'').toLowerCase();res.json(store.users.filter(u=>u.id!=='u1'&&[u.name,u.country,u.nativeLanguage,u.level].some(x=>String(x).toLowerCase().includes(q))));});
app.post('/api/onboard',(req,res)=>{const {name,country,nativeLanguage,learningLanguage,level}=req.body; const me=store.users.find(u=>u.id==='u1');for(const [k,v] of Object.entries({name,country,nativeLanguage,learningLanguage,level})) if(typeof v==='string'&&v.trim())me[k]=v.trim().slice(0,80);save();res.json(me);});
app.get('/api/rooms',(req,res)=>res.json(store.rooms));
app.post('/api/rooms/:id/join',(req,res)=>{const room=store.rooms.find(r=>r.id===req.params.id);if(!room)return res.status(404).json({error:'Room not found'});room.joined++;save();io.emit('rooms:changed',store.rooms);res.json(room);});
app.get('/api/messages/:a/:b',(req,res)=>res.json(store.messages.filter(m=>(m.from===req.params.a&&m.to===req.params.b)||(m.from===req.params.b&&m.to===req.params.a))));
app.post('/api/messages',(req,res)=>{const {from,to,text}=req.body;if(!store.users.some(u=>u.id===from)||!store.users.some(u=>u.id===to)||typeof text!=='string'||!text.trim()||text.length>1500)return res.status(400).json({error:'Invalid message'});const msg={id:crypto.randomUUID(),from,to,text:text.trim(),at:new Date().toISOString()};store.messages.push(msg);save();io.emit('message:new',msg);res.status(201).json(msg);});
app.get('/api/vocabulary/:userId',(req,res)=>res.json(store.vocabulary.filter(v=>v.userId===req.params.userId)));
app.post('/api/vocabulary',(req,res)=>{const {userId,word,category}=req.body;if(typeof word!=='string'||!word.trim()||word.length>100)return res.status(400).json({error:'Invalid word'});const item={id:crypto.randomUUID(),userId:userId||'u1',word:word.trim(),category:category||'Conversation'};store.vocabulary.push(item);const u=store.users.find(x=>x.id===item.userId);if(u)u.words=(u.words||0)+1;save();res.status(201).json(item);});
app.get('/api/stats',(req,res)=>res.json({users:store.users.length,rooms:store.rooms.length,messages:store.messages.length,reports:store.reports.filter(r=>r.status==='open').length,activeUsers:store.users.filter(x=>x.online).length}));
app.get('/api/reports',(req,res)=>res.json(store.reports));
app.post('/api/reports',(req,res)=>{const {reason,reportedUserId}=req.body;if(typeof reason!=='string'||!reason.trim())return res.status(400).json({error:'Reason required'});const report={id:crypto.randomUUID(),reason:reason.slice(0,500),reportedUserId:reportedUserId||null,status:'open',at:new Date().toISOString()};store.reports.push(report);save();res.status(201).json(report);});
app.patch('/api/reports/:id',(req,res)=>{const report=store.reports.find(r=>r.id===req.params.id);if(!report)return res.status(404).json({error:'Not found'});if(!['open','resolved'].includes(req.body.status))return res.status(400).json({error:'Invalid status'});report.status=req.body.status;save();res.json(report);});
io.on('connection',socket=>{socket.on('ping:app',()=>socket.emit('pong:app'));});
const port=Number(process.env.PORT||4000);httpServer.listen(port,'0.0.0.0',()=>console.log(`BYTALK backend running on http://localhost:${port}`));
