import subprocess
import shutil

from main.common.common import *

@singleton
class RemoteDecoder(object):

    def decode(self, wave_file):
        # prepare decode dir
        decode_dir = get_tmp_dir() + '/' + os.path.splitext(os.path.basename(wave_file))[0]
        if not os.path.exists(decode_dir):
            os.makedirs(decode_dir)

        # decode
        subprocess.call(
            ['%s/kaldi/remote_decode.sh' % get_proj_dir(), str(conf('decode:server')), str(conf('decode:port')), wave_file, decode_dir])

        # get transcript
        with open('%s/final_trans.txt' % decode_dir, 'r') as file:
            transcript = file.read()

        # delete decode dir
        shutil.rmtree(decode_dir)

        return transcript
