import { Global, Module } from '@nestjs/common';

import { CsvParserPort } from '../../domain/ports/csv-parser.port.js';
import { CsvWriterPort } from '../../domain/ports/csv-writer.port.js';
import { CsvParserAdapter } from './csv-parser.adapter.js';
import { CsvWriterAdapter } from './csv-writer.adapter.js';

@Global()
@Module({
  providers: [
    { provide: CsvParserPort, useClass: CsvParserAdapter },
    { provide: CsvWriterPort, useClass: CsvWriterAdapter },
  ],
  exports: [CsvParserPort, CsvWriterPort],
})
export class CsvModule {}
