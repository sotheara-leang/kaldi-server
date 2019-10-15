import tornado.web
import time

from main.domain.response import *
from main.service.remote_decoder import *
from main.service.sgmm2_decoder import *
from main.service.decoder import *

logger = logger(__name__)

class RestHandler(tornado.web.RequestHandler):

    async def post(self):
        try:
            if 'Content-Type' not in self.request.headers \
                    or 'audio/wav' not in self.request.headers['Content-Type']:
                response = Response.invalid()
            else:
                # init wav folder
                wav_dir = file_path('data/wav')
                if not os.path.exists(wav_dir):
                    os.makedirs(wav_dir)

                # save wave file
                save_file = '%s/%s.wav' % (wav_dir, str(int(time.time())))
                with open(save_file, 'wb') as f_writer:
                    f_writer.write(self.request.body)

                # decode wave file
                if conf('decode:remote') is True:
                    decoder = RemoteDecoder()
                elif conf('decode:sgmm2'):
                    decoder = SGMM2Decoder()
                else:
                    decoder = Decoder()

                response = Response.ok(decoder.decode(save_file).strip())
        except Exception as e:
            logger.error(e, exc_info=True)
            response = Response.fail()

        self.write(response.__dict__)
