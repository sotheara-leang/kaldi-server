#!/usr/bin/env bash

. $KALDI_SRV_HOME/conf/decode.conf

. $KALDI_SRV_HOME/kaldi/init_env.sh

model_dir=$1
wav_file=$2
decode_dir=$3

bf=`basename $wav_file`
bf=${bf%.wav}

echo $bf $wav_file >> $decode_dir/wav.scp

if [[ -f $model_dir/final.mat ]]; then
    online-wav-gmm-decode-faster --rt-min=$rt_min --rt-max=$rt_max \
    --max-active=$max_active --beam=$beam --acoustic-scale=$acoustic_scale \
    scp:$decode_dir/wav.scp $model_dir/final.mdl $model_dir/HCLG.fst \
    $model_dir/words.txt $silence_phones ark,t:$decode_dir/trans.txt \
    ark,t:$decode_dir/ali.txt $model_dir/final.mat
else
    online-wav-gmm-decode-faster --rt-min=$rt_min --rt-max=$rt_max \
    --max-active=$max_active --beam=$beam --acoustic-scale=$acoustic_scale \
    scp:$decode_dir/input.scp $model_dir/final.mdl $model_dir/HCLG.fst \
    $model_dir/words.txt $silence_phones ark,t:$decode_dir/trans.txt \
    ark,t:$decode_dir/ali.txt
fi

$KALDI_ROOT/utils/int2sym.pl -f 2- $model_dir/words.txt $decode_dir/trans.txt > $decode_dir/final_trans.txt