import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import Datastore from '@seald-io/nedb';
import { log } from '../backend/log.js';

const userDataPath = app.getPath('userData');
fs.mkdirSync(path.join( userDataPath, 'blobs' ), { recursive: true });

const Cache={};

export class DB{
    constructor( id ){
        const dbPath = path.join( userDataPath, id );
        fs.mkdirSync(path.join( userDataPath, 'blobs/'+id ), { recursive: true });
        this.dbPath = dbPath;
        this.id = id;
        if( Cache[ id ] ){
            this.db = Cache[ id ];
            return;
        }
        this.db = new Datastore( { filename: dbPath, autoload: true } );
        Cache[ id ] = this.db;
    }
    delete(){
        setTimeout(()=>{
            fs.unlinkSync( this.dbPath );
            delete( Cache[ this.id ] );
            const file = `${this.dbPath}.png`;
            if (fs.existsSync(file)) {
                fs.rm( path.join( userDataPath, 'blobs/'+this.id ) , { recursive: true, force: true },( err )=>{
                    if(err) log( err );
                })
                return fs.unlinkSync( file );
            }

        },100);
    }
    find( query, fields, sort ){
        return new Promise( ( resolve, reject )=>{
            this.db.find( query, fields ).sort( sort ).exec( ( err, result ) =>{
                if( err ){
                    reject( err );
                    return;
                }
                resolve( result );
            })
        })
    }
    findOne( query, fields ){
        return new Promise( ( resolve, reject )=>{
            this.db.findOne( query, fields, ( err, result ) =>{
                if( err ){
                    reject( err );
                    return;
                }
                if( result && result.type == 'RESPONSE'){
                    const body = this.getBody( result.uid );
                    if( body ) result.body = body;
                }
                resolve( result );
            })
        })
    }
    insert( query ){
        return new Promise( ( resolve, reject )=>{
            if(query.body && query.body!="" && query.type == 'RESPONSE'){
                fs.writeFile( path.join( userDataPath, `blobs/${this.id}/${query.uid}` ) , query.body, ( err ) => {
                    if( err ){
                        console.log( err );
                    }
                } );
                delete( query.body );
            }
            this.db.insert( query, ( err, result ) =>{
                if( err ){
                    reject( err );
                    return;
                }
                resolve( result );
            })
        })
    }
    getBody( id ){
        const filePath = path.join( userDataPath, `blobs/${this.id}/${id}` );
        if( fs.existsSync(filePath) ){
            return fs.readFileSync( filePath ).toString();
        }
        return "";
    }
    oldest( query, fromDate ){
        return new Promise( ( resolve, reject )=>{
            this.db.find(query).sort({ date: 1 }).limit(1).exec((err, result)=>{
                if( err ){
                    reject( err );
                    return;
                }
                let oldestResult = result[ 0 ];
                if( fromDate ){
                    for( let i = 0; i < result.length; i++ ){
                        if( result[i].date >= fromDate ){
                            oldestResult = result[ i ];
                            break;
                        }
                    }
                }
                if( oldestResult && oldestResult.type == 'RESPONSE'){
                    const body = this.getBody( oldestResult.uid );
                    if( body ) oldestResult.body = body;
                }
                resolve( oldestResult );
            });
        });
    }
}