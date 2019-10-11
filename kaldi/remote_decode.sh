#!/usr/bin/env bash

. $KALDI_SRV_HOME/kaldi/init_env.sh

server=$1
port=$2
wav_file=$3
decode_dir=$4

bf=`basename $wav_file`
bf=${bf%.wav}

echo $bf $wav_file >> $decode_dir/wav.scp

online-audio-client $server $port scp:$decode_dir/wav.scp > $decode_dir/final_trans.txt