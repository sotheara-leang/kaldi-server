#!/usr/bin/env bash

. $KALDI_SRV_HOME/kaldi/conf/decode.conf

. $KALDI_SRV_HOME/kaldi/init_env.sh

model=$1
port=$2

if [[ -z $port ]]; then
    port=5010
fi

online-audio-server-decode-faster \
    --verbose=1 \
    --rt-min=$rt_min \
    --rt-max=$rt_max \
    --max-active=$max_active \
    --beam=$beam \
    --acoustic-scale=$acoustic_scale \
    $model/final.mdl \
    $model/HCLG.fst \
    $model/words.txt \
    $silence_phones \
    $model/word_boundary.int \
    $port \
    $model/final.mat