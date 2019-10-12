#!/usr/bin/env bash

export KALDI_SRV_HOME=$(pwd)

export KALDI_ROOT=`grep 'kaldi-root' $KALDI_SRV_HOME/conf/config.yml | awk -F ' ' '{print $2}'`