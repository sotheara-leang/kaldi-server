import tornado.web
import time

from main.domain.response import *
from main.service.remote_decoder import *
from main.service.sgmm2_decoder import *
from main.service.decoder import *

class RestHandler(tornado.web.RequestHandler):

    async def post(self):
        _logger = logger(self)

        try:
            if 'Content-Type' not in self.request.headers \
                    or 'audio/wav' not in self.request.headers['Content-Type']:
                response = Response.invalid()
            else:
                # init wav folder
                wav_dir = get_file_path('data/wav')
                if not os.path.exists(wav_dir):
                    os.makedirs(wav_dir)

                # save wave file
                save_file = '%s/%s.wav' % (wav_dir, str(int(time.time())))
                with open(save_file, 'w+b') as f_writer:
                    f_writer.write(self.request.body)

                # decode wave file
                if conf('kaldi:decode:remote') is True:
                    decoder = RemoteDecoder()
                elif conf('kaldi:decode:sgmm2'):
                    decoder = SGMM2Decoder()
                else:
                    decoder = Decoder()

                response = Response.ok(decoder.decode(save_file))
        except Exception as e:
            _logger.error(e, exc_info=True)
            response = Response.fail()

        self.write(response.__dict__)
