import tornado.web
import time

from main.domain.response import *
from main.service.remote_decoder import *
from main.service.decoder import *

class RestHandler(tornado.web.RequestHandler):

    async def post(self):
        response = Response.fail()
        if 'multipart/form-data' not in self.request.headers['Content-Type'] or len(self.request.files) != 1:
            response = Response.invalid()
        else:
            for field_name, files in self.request.files.items():
                file_info = files[0]
                if file_info['content_type'] != 'audio/wav':
                    response = Response.invalid()
                    break

                # save wav file
                wav_dir = get_file_path('data/wav')
                if not os.path.exists(wav_dir):
                    os.makedirs(wav_dir)

                save_file = '%s/%s.wav' % (wav_dir, str(int(time.time())))
                with open(save_file, 'w+b') as f_writer:
                    data = file_info["body"]
                    f_writer.write(data)

                # decode wave file

                is_remote = conf('decode:remote')
                if is_remote is True:
                    decoder = RemoteDecoder()
                else:
                    decoder = Decoder()

                transcript = decoder.decode(save_file)

                # return response
                response = Response.ok(transcript)

        self.write(response.__dict__)

