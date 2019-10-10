import tornado.web
import json

from main.domain.response import *
from main.service.sgmm2_decoder import *

class RestHandler(tornado.web.RequestHandler):

    async def post(self):
        response = None
        if 'multipart/form-data' not in self.request.headers['Content-Type']:
            response = Response.invalid()
        else:
            for field_name, files in self.request.files.items():

                if len(files) > 1:
                    response = Response.invalid()
                    break

                file_info = files[0]

                if file_info['content_type'] == 'audio/wav':
                    response = Response.invalid()
                    break

                data = file_info["body"]

                decoder = SGMM2Decoder()

                transcript = decoder.decode(data)

                response = Response.ok(transcript)

        self.write(response.__dict__)

