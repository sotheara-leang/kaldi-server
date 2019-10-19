import tornado.websocket

from main.domain.response import *
from main.service.remote_decoder import *
from main.service.sgmm2_decoder import *
from main.service.decoder import *
import time
import json

logger = logger(__name__)

class WebSocketHandler(tornado.websocket.WebSocketHandler):

    def check_origin(self, origin):
        return 1

    def opened(self):
        pass

    def on_message(self, message):
        try:
            wav_dir = file_path('data/wav')
            if not os.path.exists(wav_dir):
                os.makedirs(wav_dir)

            save_file = '%s/%s.wav' % (wav_dir, str(int(time.time())))

            with open(save_file, 'wb') as f_writer:
                f_writer.write(message)

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

        self.write_message(json.dumps(response.__dict__, ensure_ascii=False))

    def on_close(self):
        pass
