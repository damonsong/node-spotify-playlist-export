require('dotenv').config();
const fs = require('fs');
const SpotifyWebApi = require('spotify-web-api-node');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('underscore');

/**
 * INPUT PLAYLIST ID HERE
 */
var playlistId = "5r9BATxFQONQs6EUdXncAX";

var spotifyApi = new SpotifyWebApi({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret
});

var promiseArray = [];
var tracksArray = [];
var tracksArrayRaw = [];
var totalTracks = 0;
var username = "kluskey";


// Retrieve an access token
spotifyApi.clientCredentialsGrant().then(
    function(data) {
        // console.log('The access token expires in ' + data.body['expires_in']);
        // console.log('The access token is ' + data.body['access_token']);

        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(data.body['access_token']);

        runBackup();
    },
    function(err) {
        console.log('Something went wrong when retrieving an access token', err.message);
    }
);

function runBackup() {
    getTotalTracks()
        .then(function(totalTracks) {
            console.log('Total tracks to pull:', totalTracks);

            // we can only pull 100 at a time
            for (let index = 0; index < totalTracks; index += 100) {
                console.log('Pulling batch:', index)
                promiseArray.push(pullBatch(index))
            }
            //uncomment for single batch test
            // promiseArray.push(pullBatch(0))

            return Promise.all(promiseArray)
        })
        .then(function(result) {
            processRawTrackArray();
        })
        .then(function(result) {
            writeExportsToFile();
        })
        .catch(function(error) {
            console.error(error);
        })
}

function pullBatch(startIndex) {
    return new Promise(function(resolve, reject) {

        spotifyApi.getPlaylistTracks(username, playlistId, {
                offset: startIndex,
                limit: 100
            })
            .then(function(returnData) {
                // console.log('Some information about this playlist', data.body);
                let data = returnData.body;
                // console.log(JSON.stringify(data, null, 2));

                data.items.forEach(item => {
                    tracksArrayRaw.push(item);
                });

                resolve();

            }, function(err) {
                console.log('Something went wrong!', err);
                reject(err);
            });

    });
}

function getTotalTracks() {
    return new Promise(function(resolve, reject) {

        spotifyApi.getPlaylistTracks(username, playlistId)
            .then(function(returnData) {
                let data = returnData.body;

                //update the total of all tracks
                totalTracks = data.total;

                resolve(totalTracks);

            }, function(err) {
                console.log('Something went wrong!', err);
                reject(err);
            });

    });
}

function processRawTrackArray() {
    return new Promise(function(resolve, reject) {

        tracksArrayRaw.forEach(rawItem => {
            // console.log(item.track.artists);
            let artistNames = [];
            rawItem.track.artists.forEach(artist => {
                // console.log(element.name);
                artistNames.push(artist.name)
            });

            addTrackToExport(rawItem.track.name, artistNames.join(", "), rawItem.track.album.name, rawItem.added_at, rawItem.track.external_urls.spotify);
        });

        resolve();

    });
}

function addTrackToExport(trackName, artistName, albumName, date, url) {
    let trackString = trackName + " | " + artistName + " | " + albumName + " | " + date + " | " + url + "\n";
    tracksArray.push(trackString);
}

function writeExportsToFile() {
    console.log("Writing tracks to file... Please wait.");
    fs.writeFile('backup.txt', tracksArray.join(""), (err) => {
        if (err) throw err;
        console.log(tracksArray.length + ' tracks have been saved!');
    });
}