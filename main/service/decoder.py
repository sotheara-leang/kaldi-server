import subprocess
import shutil

from main.common.common import *

@singleton
class Decoder(object):

    def decode(self, wave_file):
        # prepare decode dir
        decode_dir = get_tmp_dir() + '/' + os.path.splitext(os.path.basename(wave_file))[0]
        if not os.path.exists(decode_dir):
            os.makedirs(decode_dir)

        # decode
        subprocess.call(
            ['%s/kaldi/decode.sh' % get_proj_dir(), conf('kaldi:model'), wave_file, decode_dir])

        # get transcript
        with open('%s/final_trans.txt' % decode_dir, 'r') as file:
            content = file.read()
            transcript = ' '.join(content.split()[1:])

        # delete decode dir
        shutil.rmtree(decode_dir)

        return transcript
