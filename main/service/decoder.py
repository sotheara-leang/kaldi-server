import shutil

from main.common.common import *

@singleton
class Decoder(object):

    def decode(self, wave_file):
        # prepare decode dir
        decode_dir = tmp_dir() + '/' + os.path.splitext(os.path.basename(wave_file))[0]
        if not os.path.exists(decode_dir):
            os.makedirs(decode_dir)

        # decode
        cmd = ['%s/kaldi/decode.sh' % proj_dir(), conf('decode:model'), wave_file, decode_dir, '&> /dev/null']
        os.system(' '.join(cmd))

        # get transcript
        with open('%s/final_trans.txt' % decode_dir, 'r') as file:
            content = file.read()
            transcript = ' '.join(content.split()[1:])

        # delete decode dir
        shutil.rmtree(decode_dir)

        return transcript
