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
  ], vocabulary:[{id:'v1',userId:'u1',word:'conversation',category:'Conversation'}],reports:[],
  phrases: [
    {id:'ph1', category:'Greetings', phrase:'How are you doing?', translation:'¿Cómo estás?', language:'Spanish', example:'How are you doing today, Maria?', status:'published', createdAt:new Date().toISOString()},
    {id:'ph2', category:'Travel', phrase:'Where is the nearest station?', translation:'最寄りの駅はどこですか？', language:'Japanese', example:'Excuse me, where is the nearest station?', status:'published', createdAt:new Date().toISOString()},
    {id:'ph3', category:'Food', phrase:'I would like to order...', translation:'मैं ऑर्डर करना चाहूँगा...', language:'Hindi', example:'I would like to order a coffee, please.', status:'draft', createdAt:new Date().toISOString()}
  ],
  notifications: [
    {id:'n1', title:'Welcome to BYTALK!', message:'Start your language journey today. Find a partner and begin chatting!', target:'all', status:'sent', sentAt:new Date().toISOString(), createdAt:new Date().toISOString()},
    {id:'n2', title:'New Beginner Rooms Available', message:'We have added new beginner-friendly rooms. Jump in and practice!', target:'beginners', status:'draft', sentAt:null, createdAt:new Date().toISOString()}
  ],
  auditLog: [
    {id:'a1', action:'system.start', user:'system', target:'server', details:'BYTALK backend initialized', at:new Date().toISOString()},
    {id:'a2', action:'user.create', user:'system', target:'u1', details:'Seed user Pavan Nerkar created', at:new Date().toISOString()},
    {id:'a3', action:'room.create', user:'system', target:'r1', details:'Seed room Everyday English created', at:new Date().toISOString()}
  ],
  roles: [
    {id:'role1', name:'Super Admin', permissions:['users.manage','rooms.manage','vocabulary.manage','phrases.manage','reports.manage','notifications.manage','audit.view','roles.manage','settings.manage']},
    {id:'role2', name:'Moderator', permissions:['users.view','rooms.manage','reports.manage','notifications.view','audit.view']},
    {id:'role3', name:'Content Editor', permissions:['vocabulary.manage','phrases.manage','rooms.view','notifications.manage']}
  ],
  adminUsers: [
    {id:'adm1', name:'Pavan Nerkar', email:'pavan@bytalk.com', role:'Super Admin', lastLogin:new Date().toISOString(), status:'active'},
    {id:'adm2', name:'Sneha Kulkarni', email:'sneha@bytalk.com', role:'Moderator', lastLogin:new Date().toISOString(), status:'active'}
  ]
};
let store;
try { store = JSON.parse(fs.readFileSync(dbFile,'utf8')); } catch { store = seed; fs.writeFileSync(dbFile,JSON.stringify(store,null,2)); }
/* Ensure new collections exist in loaded store */
store.phrases = store.phrases || seed.phrases;
store.notifications = store.notifications || seed.notifications;
store.auditLog = store.auditLog || seed.auditLog;
store.roles = store.roles || seed.roles;
store.adminUsers = store.adminUsers || seed.adminUsers;
const save = () => fs.writeFileSync(dbFile,JSON.stringify(store,null,2));
/* Audit log helper */
function audit(action, target, details, user) {
  const entry = {id:crypto.randomUUID(), action, user:user||'admin', target, details, at:new Date().toISOString()};
  store.auditLog.push(entry);
  save();
  return entry;
}
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
app.get('/api/stats',(req,res)=>res.json({users:store.users.length,rooms:store.rooms.length,messages:store.messages.length,reports:store.reports.filter(r=>r.status==='open').length,activeUsers:store.users.filter(x=>x.online).length,sessions:847,successfulMatches:store.messages.length*2,vocabulary:store.vocabulary.length,phrases:store.phrases.length}));
app.get('/api/reports',(req,res)=>res.json(store.reports));
app.post('/api/reports',(req,res)=>{const {reason,reportedUserId}=req.body;if(typeof reason!=='string'||!reason.trim())return res.status(400).json({error:'Reason required'});const report={id:crypto.randomUUID(),reason:reason.slice(0,500),reportedUserId:reportedUserId||null,status:'open',at:new Date().toISOString()};store.reports.push(report);save();res.status(201).json(report);});
app.patch('/api/reports/:id',(req,res)=>{const report=store.reports.find(r=>r.id===req.params.id);if(!report)return res.status(404).json({error:'Not found'});if(!['open','resolved'].includes(req.body.status))return res.status(400).json({error:'Invalid status'});report.status=req.body.status;save();res.json(report);});

/* ───── User Management ───── */
app.post('/api/users',(req,res)=>{
  const user={id:'u_'+crypto.randomUUID().slice(0,12), ...req.body, status:req.body.status||'active', createdAt:new Date().toISOString()};
  if(!user.name) return res.status(400).json({error:'name required'});
  store.users.push(user);
  save();
  audit('user.create',user.id,`User ${user.name} created`);
  res.status(201).json(user);
});
app.patch('/api/users/:id',(req,res)=>{const user=store.users.find(u=>u.id===req.params.id);if(!user)return res.status(404).json({error:'User not found'});const {status,online,level,accessLimitations}=req.body;if(status!==undefined)user.status=status;if(online!==undefined)user.online=online;if(level!==undefined)user.level=level;if(accessLimitations!==undefined)user.accessLimitations=accessLimitations;Object.assign(user,req.body);delete user.id;save();audit('user.update',user.id,`User ${user.name} updated: ${JSON.stringify(req.body)}`);res.json(user);});
app.delete('/api/users/:id',(req,res)=>{const idx=store.users.findIndex(u=>u.id===req.params.id);if(idx===-1)return res.status(404).json({error:'User not found'});const removed=store.users.splice(idx,1)[0];save();audit('user.delete',removed.id,`User ${removed.name} removed`);res.json({ok:true,removed});});

/* ───── Room Management ───── */
app.post('/api/rooms',(req,res)=>{const {name,topic,level,capacity,status}=req.body;if(typeof name!=='string'||!name.trim())return res.status(400).json({error:'Room name required'});const room={id:crypto.randomUUID(),name:name.trim().slice(0,100),topic:topic||'General',level:level||'All levels',listeners:0,joined:0,capacity:capacity||50,status:status||'active',createdAt:new Date().toISOString()};store.rooms.push(room);save();audit('room.create',room.id,`Room "${room.name}" created`);io.emit('rooms:changed',store.rooms);res.status(201).json(room);});
app.patch('/api/rooms/:id',(req,res)=>{const room=store.rooms.find(r=>r.id===req.params.id);if(!room)return res.status(404).json({error:'Room not found'});const {name,topic,level,capacity,status}=req.body;if(name!==undefined)room.name=String(name).trim().slice(0,100);if(topic!==undefined)room.topic=topic;if(level!==undefined)room.level=level;if(capacity!==undefined)room.capacity=capacity;if(status!==undefined)room.status=status;save();audit('room.update',room.id,`Room "${room.name}" updated`);io.emit('rooms:changed',store.rooms);res.json(room);});
app.delete('/api/rooms/:id',(req,res)=>{const idx=store.rooms.findIndex(r=>r.id===req.params.id);if(idx===-1)return res.status(404).json({error:'Room not found'});const removed=store.rooms.splice(idx,1)[0];save();audit('room.delete',removed.id,`Room "${removed.name}" deleted`);io.emit('rooms:changed',store.rooms);res.json({ok:true,removed});});

/* ───── Vocabulary CMS ───── */
app.post('/api/vocabulary/cms',(req,res)=>{const {word,category,difficulty,status,options,correctAnswer}=req.body;if(typeof word!=='string'||!word.trim()||word.length>100)return res.status(400).json({error:'Invalid word'});const item={id:crypto.randomUUID(),word:word.trim(),category:category||'General',difficulty:difficulty||'medium',status:status||'published',options:options||[],correctAnswer:correctAnswer||'',createdAt:new Date().toISOString()};store.vocabulary.push(item);save();audit('vocabulary.create',item.id,`Vocabulary "${item.word}" created`);res.status(201).json(item);});
app.patch('/api/vocabulary/:id',(req,res)=>{const item=store.vocabulary.find(v=>v.id===req.params.id);if(!item)return res.status(404).json({error:'Vocabulary item not found'});const {word,category,difficulty,status,options,correctAnswer}=req.body;if(word!==undefined)item.word=String(word).trim().slice(0,100);if(category!==undefined)item.category=category;if(difficulty!==undefined)item.difficulty=difficulty;if(status!==undefined)item.status=status;if(options!==undefined)item.options=options;if(correctAnswer!==undefined)item.correctAnswer=correctAnswer;save();audit('vocabulary.update',item.id,`Vocabulary "${item.word}" updated`);res.json(item);});
app.delete('/api/vocabulary/:id',(req,res)=>{const idx=store.vocabulary.findIndex(v=>v.id===req.params.id);if(idx===-1)return res.status(404).json({error:'Vocabulary item not found'});const removed=store.vocabulary.splice(idx,1)[0];save();audit('vocabulary.delete',removed.id,`Vocabulary "${removed.word}" deleted`);res.json({ok:true,removed});});

/* ───── Phrase CMS ───── */
app.get('/api/phrases',(req,res)=>res.json(store.phrases));
app.post('/api/phrases',(req,res)=>{const {category,phrase,translation,language,example,status}=req.body;if(typeof phrase!=='string'||!phrase.trim())return res.status(400).json({error:'Phrase required'});const item={id:crypto.randomUUID(),category:category||'General',phrase:phrase.trim().slice(0,300),translation:translation||'',language:language||'',example:example||'',status:status||'draft',createdAt:new Date().toISOString()};store.phrases.push(item);save();audit('phrase.create',item.id,`Phrase "${item.phrase}" created`);res.status(201).json(item);});
app.patch('/api/phrases/:id',(req,res)=>{const item=store.phrases.find(p=>p.id===req.params.id);if(!item)return res.status(404).json({error:'Phrase not found'});const {category,phrase,translation,language,example,status}=req.body;if(category!==undefined)item.category=category;if(phrase!==undefined)item.phrase=String(phrase).trim().slice(0,300);if(translation!==undefined)item.translation=translation;if(language!==undefined)item.language=language;if(example!==undefined)item.example=example;if(status!==undefined)item.status=status;save();audit('phrase.update',item.id,`Phrase "${item.phrase}" updated`);res.json(item);});
app.delete('/api/phrases/:id',(req,res)=>{const idx=store.phrases.findIndex(p=>p.id===req.params.id);if(idx===-1)return res.status(404).json({error:'Phrase not found'});const removed=store.phrases.splice(idx,1)[0];save();audit('phrase.delete',removed.id,`Phrase "${removed.phrase}" deleted`);res.json({ok:true,removed});});

/* ───── Moderation ───── */
app.get('/api/moderation/flagged',(req,res)=>{const flaggedReports=store.reports.filter(r=>r.status==='open');const flaggedMessages=store.messages.filter(m=>m.flagged);res.json({reports:flaggedReports,messages:flaggedMessages,total:flaggedReports.length+flaggedMessages.length});});
app.patch('/api/reports/:id/action',(req,res)=>{const report=store.reports.find(r=>r.id===req.params.id);if(!report)return res.status(404).json({error:'Report not found'});const {action}=req.body;if(!['warn','suspend','dismiss'].includes(action))return res.status(400).json({error:'Invalid action. Must be: warn, suspend, dismiss'});report.actionTaken=action;report.actionAt=new Date().toISOString();if(action==='dismiss'){report.status='resolved';}else if(action==='suspend'&&report.reportedUserId){const user=store.users.find(u=>u.id===report.reportedUserId);if(user)user.status='suspended';report.status='resolved';}else if(action==='warn'){report.status='resolved';}save();audit('moderation.action',report.id,`Report action: ${action} on user ${report.reportedUserId||'unknown'}`);res.json(report);});

/* ───── Notifications ───── */
app.get('/api/notifications',(req,res)=>res.json(store.notifications));
app.post('/api/notifications',(req,res)=>{const {title,message,target,status}=req.body;if(typeof title!=='string'||!title.trim())return res.status(400).json({error:'Title required'});if(typeof message!=='string'||!message.trim())return res.status(400).json({error:'Message required'});const notif={id:crypto.randomUUID(),title:title.trim().slice(0,200),message:message.trim().slice(0,1000),target:target||'all',status:status||'draft',sentAt:status==='sent'?new Date().toISOString():null,createdAt:new Date().toISOString()};store.notifications.push(notif);save();audit('notification.create',notif.id,`Notification "${notif.title}" created`);res.status(201).json(notif);});
app.patch('/api/notifications/:id',(req,res)=>{const notif=store.notifications.find(n=>n.id===req.params.id);if(!notif)return res.status(404).json({error:'Notification not found'});const {title,message,target,status}=req.body;if(title!==undefined)notif.title=String(title).trim().slice(0,200);if(message!==undefined)notif.message=String(message).trim().slice(0,1000);if(target!==undefined)notif.target=target;if(status!==undefined){notif.status=status;if(status==='sent'&&!notif.sentAt)notif.sentAt=new Date().toISOString();}save();audit('notification.update',notif.id,`Notification "${notif.title}" updated`);res.json(notif);});
app.delete('/api/notifications/:id',(req,res)=>{const idx=store.notifications.findIndex(n=>n.id===req.params.id);if(idx===-1)return res.status(404).json({error:'Notification not found'});const removed=store.notifications.splice(idx,1)[0];save();audit('notification.delete',removed.id,`Notification "${removed.title}" deleted`);res.json({ok:true,removed});});

/* ───── Audit & Roles ───── */
app.get('/api/audit',(req,res)=>res.json(store.auditLog));
app.get('/api/roles',(req,res)=>res.json(store.roles));
app.get('/api/admin-users',(req,res)=>res.json(store.adminUsers));
app.patch('/api/admin-users/:id',(req,res)=>{const admin=store.adminUsers.find(a=>a.id===req.params.id);if(!admin)return res.status(404).json({error:'Admin user not found'});const {name,email,role,status}=req.body;if(name!==undefined)admin.name=name;if(email!==undefined)admin.email=email;if(role!==undefined)admin.role=role;if(status!==undefined)admin.status=status;save();audit('admin.update',admin.id,`Admin user "${admin.name}" updated`);res.json(admin);});

io.on('connection',socket=>{socket.on('ping:app',()=>socket.emit('pong:app'));});
const port=Number(process.env.PORT||4000);httpServer.listen(port,'0.0.0.0',()=>console.log(`BYTALK backend running on http://localhost:${port}`));
