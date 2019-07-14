# Dubbatransitek

![Demo](https://i.imgur.com/UnORUZK.gif)

Dubbatransitek is a collaborative musical platform. It allows you to create or import playlists from Youtube, Soundcloud, Spotify or Deezer. On the platform, you can create playlist, listen them, add, remove or download tracks, share to a friends, etc.

## Docker Install

First, download and run mongoDB Docker
```
docker pull mongo:latest
docker run --name md -d mongo
```
Then, build and run the docker file
```
git clone https://github.com/Guisch/Dubbatransitek.git
cd Dubbatransitek
docker build -t dubbatransitek .
docker run --name db --link md:mongo -p 8880:8880 -d dubbatransitek
```

## Classic Install
### Prerequisites

To run dubbatransitek, you need node and npm ([nvm](https://github.com/creationix/nvm) use is recommended). It is tested on npm 5.3.0 and node 8.4.0.
You'll also need python to run eyeD3.

 - ffmpeg >= 2.8 with lamemp3, best way: remove ffmpeg and [build it from source](https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu)
```
apt-get update -qq && apt-get -y install \
  autoconf \
  automake \
  build-essential \
  cmake \
  git \
  libass-dev \
  libfreetype6-dev \
  libsdl2-dev \
  libtheora-dev \
  libtool \
  libva-dev \
  libvdpau-dev \
  libvorbis-dev \
  libxcb1-dev \
  libxcb-shm0-dev \
  libxcb-xfixes0-dev \
  mercurial \
  pkg-config \
  texinfo \
  wget \
  zlib1g-dev \
  yasm \
  libfdk-aac-dev \
  libmp3lame-dev \
  libopus-dev
mkdir -p ~/ffmpeg_sources ~/bin
cd ~/ffmpeg_sources && \
wget http://www.nasm.us/pub/nasm/releasebuilds/2.13.02/nasm-2.13.02.tar.bz2 && \
tar xjvf nasm-2.13.02.tar.bz2 && \
cd nasm-2.13.02 && \
./autogen.sh && \
PATH="$HOME/bin:$PATH" ./configure --prefix="$HOME/ffmpeg_build" --bindir="$HOME/bin" && \
make && \
make install
cd ~/ffmpeg_sources && \
wget -O ffmpeg-snapshot.tar.bz2 http://ffmpeg.org/releases/ffmpeg-snapshot.tar.bz2 && \
tar xjvf ffmpeg-snapshot.tar.bz2 && \
cd ffmpeg && \
PATH="$HOME/bin:$PATH" PKG_CONFIG_PATH="$HOME/ffmpeg_build/lib/pkgconfig" ./configure \
  --prefix="$HOME/ffmpeg_build" \
  --pkg-config-flags="--static" \
  --extra-cflags="-I$HOME/ffmpeg_build/include" \
  --extra-ldflags="-L$HOME/ffmpeg_build/lib" \
  --extra-libs="-lpthread -lm" \
  --bindir="$HOME/bin" \
  --enable-libass \
  --enable-libfdk-aac \
  --enable-libfreetype \
  --enable-libmp3lame \
  --enable-libopus \
  --enable-libtheora \
  --enable-libvorbis \
  --enable-nonfree && \
PATH="$HOME/bin:$PATH" make && \
make install && \
hash -r
source ~/.profile
```
 - mongodb (https://docs.mongodb.com/manual/installation/)

If you would like to use Youtube, Soundcloud, Spotify or Deezer authentication, you will also need to register a new app on website, and rename /config/auth-default.js to /config/auth.js and edit the file with different key from

 - [Youtube](https://developers.google.com/youtube/registering_an_application)
 - [Soundcloud](http://soundcloud.com/you/apps/new)
 - [Spotify](https://developer.spotify.com/my-applications/#!/applications/create)
 - [Deezer](http://developers.deezer.com/myapps/create)

If you would like to use similar song feature, you will also need a youtube (v2) and lastfm api key

 - [Lastfm](https://www.last.fm/api/account/create)
 - [Youtube](https://developers.google.com/youtube/registering_an_application)

### Installing dependencies

Simply clone the repo, then run

```
npm install
```

Then edit the config/database.js file to connect Dubbatransitek to your DB

### Run

Simply run

```
npm start
```

By default, it will use the environment variable PORT, or 8880 if there's nothing there.

## Versioning

 **0.0.5 (in-dev):**
 - Totally rethink the database structure (add music model, be careful, old database <=0.0.4 or not compatible with newer)
 - Update README
 - Design change on playlist pages (sticky player)
 - Fix remove button (launch music when clicked)
 - Improve music changing speed: no more reloading
 - Use [ssydtomp3](https://github.com/Guisch/ssydtomp3) instead of alltomp3 wich fix souncloud playlist import and add spotify and deezer track download
 - Playlist music ordering https://github.com/RubaXa/Sortable
 - Random order playback
 - Improve download playlist as zip function
 - Imported Playlist syncing now working properly every 30 min
 - Server side generated waveform
 - Increase of navigation speed by reducing amount of data sent
 - URL is now updated while music is changing
 - Add docker ! Install Dubbatransitek in a command !
 - Page to edit music info (WIP)

 **0.0.4:**
 - Remove the opacity fade transition (it was causing bug when seeking during the musics transition)
 - You can now add music directly with just a title
 - The song is no longer re-downloaded if it already was before
 - Delete playlist and song now delete file
 - You can also now add a music similar to the listened music of your playlist based from last.fm suggestion. In addition, you can now enable the option to automatically add similar songs when you finish listen your playlist (in order to not listen your playlist again)
 - fix next and previous button
 - fix pause when 2 songs are playing (when fade effect)
 - Update README
 - You have now the ability to enable automatic imported playlist syncing (if you import a youtube playlist for example, and add song on the same playlist on youtube several day later, dubbatransitek will automatically download the added song to add it to your Dubbatransitek playlist, run every day at midnight)
 - Add queue system: As transcoding video to mp3 use some CPU resources, I created a queue. The queue is global for all user
 - Add volume bar (logarythm scale and mute at 1)

**0.0.3:**
 - switch from 'playlists' page to 'myPlaylists' and 'allPlaylists' pages (with a spotify style display on myPlaylists, allPlaylists design need to be redesign)
 - add 10s fade transition while playback music
 - fix remove song buttons
 - add download Playlist
 - add next and previous button
 - minor fix
 - add sync when adding or removing song from a playlist (if you add/remove a song on a playlist, the playlist will update automatically on every opened pages for all users, no need to refresh the page, can be useful in party for example)

**0.0.2:**
 - Added permission (user not able to remove playlist or songs from another user playlists)
 - lang file is also added (./lang/fr_FR.json) feel free to translate ! :)

**0.0.1:**
 - first working version

## TODO
 - Improve notification system
 - Import playlist from youtube, deezer or spotify section
 - Improve download playlist function (add field on playlist model)
 - Party mode to be enable to remote control playlist
 - Feed of last added song with the ability to like and comment
 - Feel free to propose in issue section

## Tip
If you like my work, offer me a beer ! :)
- Paypal : https://paypal.me/guiisch
- ETH: 0xbE08c367280EF1b945c327419Afec474B5E1eff6
