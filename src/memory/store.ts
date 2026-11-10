import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {hash} from '../security/index.js';
import type {Message} from '../qq/event.js';
export interface Turn {role:'user'|'assistant';content:string}
export interface Job {key:string; message:Message; reply:string|null; state:string}
export class Store {
 readonly db:DatabaseSync;
 constructor(path:string,readonly limit=20,readonly ttl=86400000){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
 this.db=new DatabaseSync(path);if(path!==':memory:')chmodSync(path,0o600);
 this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA secure_delete=ON;
 CREATE TABLE IF NOT EXISTS turns(id INTEGER PRIMARY KEY, scope TEXT, role TEXT, content TEXT, ts INTEGER);
 CREATE INDEX IF NOT EXISTS turns_scope ON turns(scope,id);
 CREATE TABLE IF NOT EXISTS settings(scope TEXT PRIMARY KEY, enabled INTEGER);
 CREATE TABLE IF NOT EXISTS jobs(key TEXT PRIMARY KEY, scope TEXT, payload TEXT, reply TEXT, state TEXT, ts INTEGER);
 CREATE TABLE IF NOT EXISTS counters(key TEXT PRIMARY KEY,n INTEGER,expires INTEGER);`);
 // Single replica only: processing interrupted by a crash is retried with the same outgoing msg_seq.
 this.db.exec("UPDATE jobs SET state='queued' WHERE state='processing'");
 }
 scope(group:string){return 'group:'+hash(group);}
 history(group:string):Turn[]{this.cleanup();return this.db.prepare('SELECT role,content FROM (SELECT id,role,content FROM turns WHERE scope=? ORDER BY id DESC LIMIT ?) ORDER BY id').all(this.scope(group),this.limit) as unknown as Turn[];}
 append(group:string,role:Turn['role'],content:string){this.db.prepare('INSERT INTO turns(scope,role,content,ts) VALUES(?,?,?,?)').run(this.scope(group),role,content,Date.now());this.db.prepare('DELETE FROM turns WHERE scope=? AND id NOT IN (SELECT id FROM turns WHERE scope=? ORDER BY id DESC LIMIT ?)').run(this.scope(group),this.scope(group),this.limit);}
 reset(group:string){this.db.prepare('DELETE FROM turns WHERE scope=?').run(this.scope(group));}
 enabled(group:string){const row=this.db.prepare('SELECT enabled FROM settings WHERE scope=?').get(this.scope(group)) as any;return row?.enabled!==0;}
 enable(group:string,on:boolean){this.db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(this.scope(group),on?1:0);}
 enqueue(m:Message,max:number){this.cleanup();const key=hash(m.group+':'+m.id);if(this.db.prepare('SELECT key FROM jobs WHERE key=?').get(key))return 'duplicate';if(this.pending()>=max)return 'full';this.db.prepare("INSERT INTO jobs VALUES(?,?,?,?,?,?)").run(key,this.scope(m.group),JSON.stringify(m),null,'queued',Date.now());return 'queued';}
 pending(){return Number((this.db.prepare("SELECT COUNT(*) n FROM jobs WHERE state IN ('queued','processing')").get() as any).n);}
 next():Job|null{const r=this.db.prepare("SELECT * FROM jobs WHERE state='queued' ORDER BY ts,rowid LIMIT 1").get() as any;if(!r)return null;this.db.prepare("UPDATE jobs SET state='processing' WHERE key=?").run(r.key);return {key:r.key,message:JSON.parse(r.payload),reply:r.reply,state:r.state};}
 requeue(key:string){this.db.prepare("UPDATE jobs SET state='queued' WHERE key=?").run(key);}
 saveReply(key:string,reply:string){this.db.prepare('UPDATE jobs SET reply=? WHERE key=?').run(reply,key);}
 done(key:string,state='done'){this.db.prepare('UPDATE jobs SET state=?,payload=NULL,reply=NULL WHERE key=?').run(state,key);}
 consume(key:string,limit:number,expires:number,amount=1){this.db.prepare('INSERT INTO counters VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET n=CASE WHEN expires<? THEN excluded.n ELSE n+excluded.n END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END').run(key,amount,expires,Date.now(),Date.now());const n=Number((this.db.prepare('SELECT n FROM counters WHERE key=?').get(key) as any).n);return {allowed:n<=limit,n};}
 cleanup(){const now=Date.now();this.db.prepare('DELETE FROM turns WHERE ts<?').run(now-this.ttl);this.db.prepare("UPDATE jobs SET state='expired',payload=NULL,reply=NULL WHERE ts<? AND state IN ('queued','processing')").run(now-270000);this.db.prepare('DELETE FROM jobs WHERE ts<?').run(now-86400000);this.db.prepare('DELETE FROM counters WHERE expires<?').run(now);}
 close(){this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');this.db.close();}
}
