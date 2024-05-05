import fs from 'fs'
import path from 'node:path';
import { app } from 'electron';

const userDataPath = app.getPath('userData');
const localStoragePath = path.join(userDataPath, 'localstorage');

export const localStorage={
    save: saveStorage
};

export function initLocalStore(){
    return new Promise( ( resolve, reject ) =>{
        fs.readFile( localStoragePath, 'utf8', ( err, data ) => {
            if( err ){
                resolve( localStorage );
                return;
            }
            const json = JSON.parse( data );
            for( let key in json ) localStorage[ key ] = json[ key ];
            localStorage.save = saveStorage;
            resolve( localStorage );
        });
    }); 
}

function saveStorage(){
    return new Promise( ( resolve, reject ) =>{
        fs.writeFile( localStoragePath, JSON.stringify( localStorage ), (err) => {
            if( err ){
                reject( err );
                return;
            }
            resolve();
        } );
    } )
}

