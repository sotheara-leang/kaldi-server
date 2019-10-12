#!/usr/bin/env bash

. $KALDI_SRV_HOME/kaldi/conf/decode_sgmm2.conf

. $KALDI_SRV_HOME/kaldi/init_env.sh

model_dir=$1
wav_file=$2
decode_dir=$3

bf=`basename $wav_file`
bf=${bf%.wav}

echo $bf $wav_file >> $decode_dir/wav.scp

compute-mfcc-feats --config=$KALDI_SRV_HOME/kaldi/conf/mfcc.conf \
    scp:$decode_dir/wav.scp \
    ark,scp:$decode_dir/feats.ark,$decode_dir/feats.scp || exit 1

compute-cmvn-stats scp:$decode_dir/feats.scp ark,scp:$decode_dir/cmvn.ark,$decode_dir/cmvn.scp || exit 1

cmvn_opts=`cat $decode_dir/cmvn_opts 2>/dev/null`

splice_opts=`cat $decode_dir/splice_opts 2>/dev/null`

apply-cmvn $cmvn_opts scp:$decode_dir/cmvn.scp scp:$decode_dir/feats.scp ark:- \
    | splice-feats $splice_opts ark:- ark:- \
    | transform-feats $model_dir/final.mat ark:- ark:- > $decode_dir/normalized_feats.scp || exit 1

sgmm2-gselect --full-gmm-nbest=15 $model_dir/final.mdl \
    ark,t:$decode_dir/normalized_feats.scp "ark:|gzip -c > $decode_dir/gselect.gz" || exit 1;

gselect="--gselect=ark,s,cs:gunzip -c $decode_dir/gselect.gz| copy-gselect --n=3 ark:- ark:- |"

sgmm2-latgen-faster "$gselect" --max-active=$max_active --beam=$beam --lattice-beam=$lattice_beam \
    --acoustic-scale=$acoustic_scale --determinize-lattice=$determinize_lattice --allow-partial=$allow_partial \
    --word-symbol-table=$model_dir/words.txt \
    $model_dir/final.alimdl $model_dir/HCLG.fst \
    ark,t:$decode_dir/normalized_feats.scp ark,t:$decode_dir/lattices.ark ark,t:$decode_dir/trans.txt || exit 1

$KALDI_ROOT/utils/int2sym.pl -f 2- $model_dir/words.txt $decode_dir/trans.txt > $decode_dir/final_trans.txt