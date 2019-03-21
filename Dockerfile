FROM ubuntu:16.04

RUN apt-get update -qq && apt-get -y install  \
    autoconf  \
    automake  \
    build-essential  \
    cmake  \
    git  \
    libass-dev  \
    libfreetype6-dev  \
    libsdl2-dev  \
    libtheora-dev  \
    libtool  \
    libva-dev  \
    libvdpau-dev  \
    libvorbis-dev  \
    libxcb1-dev  \
    libxcb-shm0-dev  \
    libxcb-xfixes0-dev  \
    mercurial  \
    pkg-config  \
    texinfo  \
    wget  \
    zlib1g-dev  \
    yasm  \
    libfdk-aac-dev  \
    libmp3lame-dev  \
    libopus-dev  \
    zip  \
    software-properties-common \
    curl

EXPOSE 8880

ENV NAME Dubbatransitek

CMD wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash &&  \
    export NVM_DIR="$HOME/.nvm" &&  \
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" &&  \
    mkdir -p ~/ffmpeg_sources ~/bin &&  \
    export MAKEFLAGS="-j4" &&  \
    cd ~/ffmpeg_sources &&  \
    wget http://www.nasm.us/pub/nasm/releasebuilds/2.13.02/nasm-2.13.02.tar.bz2 &&  \
    tar xjvf nasm-2.13.02.tar.bz2 &&  \
    cd nasm-2.13.02 &&  \
    ./autogen.sh &&  \
    PATH="$HOME/bin:$PATH" ./configure --prefix="$HOME/ffmpeg_build" --bindir="$HOME/bin" &&  \
    make &&  \
    make install &&  \
    cd ~/ffmpeg_sources &&  \
    wget -O ffmpeg-snapshot.tar.bz2 http://ffmpeg.org/releases/ffmpeg-snapshot.tar.bz2 &&  \
    tar xjvf ffmpeg-snapshot.tar.bz2 &&  \
    cd ffmpeg &&  \
    PATH="$HOME/bin:$PATH" PKG_CONFIG_PATH="$HOME/ffmpeg_build/lib/pkgconfig" ./configure  \
    --prefix="$HOME/ffmpeg_build"  \
    --pkg-config-flags="--static"  \
    --extra-cflags="-I$HOME/ffmpeg_build/include"  \
    --extra-ldflags="-L$HOME/ffmpeg_build/lib"  \
    --extra-libs="-lpthread -lm"  \
    --bindir="$HOME/bin"  \
    --enable-libass  \
    --enable-libfdk-aac  \
    --enable-libfreetype  \
    --enable-libmp3lame  \
    --enable-libopus  \
    --enable-libtheora  \
    --enable-libvorbis  \
    --enable-nonfree &&  \
    PATH="$HOME/bin:$PATH" make &&  \
    make install &&  \
    hash -r &&  \
    export PATH=$PATH:/root/bin &&  \
    . ~/.profile &&  \
    . ~/.bashrc &&  \
    cd ~ &&  \
    git clone https://github.com/Guisch/Dubbatransitek.git Dubbatransitek --branch dev &&  \
    cd ~/Dubbatransitek &&  \
    nvm install 10.4.1 &&  \
    npm install &&  \
    mv ./config/auth-default.js ./config/auth.js &&  \
    sed -i -e 's/localhost/mongo/g' ./config/database.js &&  \
    npm start
