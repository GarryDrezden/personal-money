<?php

/**
 * Minimal XLSX reader (first sheet, shared strings + cell values).
 */
class SimpleXlsxReader
{
    /** @var list<string> */
    private array $sharedStrings = [];

    /** @return list<list<mixed>> rows indexed from 1, cols from 1 */
    public function readSheet(string $filePath): array
    {
        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            throw new RuntimeException('Cannot open xlsx: ' . $filePath);
        }

        $sharedXml = $zip->getFromName('xl/sharedStrings.xml');
        $this->sharedStrings = $sharedXml ? $this->parseSharedStrings($sharedXml) : [];

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXml === false) {
            $zip->close();
            throw new RuntimeException('sheet1.xml not found');
        }

        $rows = $this->parseSheet($sheetXml);
        $zip->close();
        return $rows;
    }

    /** @return list<string> */
    private function parseSharedStrings(string $xml): array
    {
        $doc = simplexml_load_string($xml);
        if ($doc === false) {
            return [];
        }
        $out = [];
        foreach ($doc->si as $si) {
            if (isset($si->t)) {
                $out[] = (string) $si->t;
                continue;
            }
            $text = '';
            foreach ($si->r as $run) {
                $text .= (string) $run->t;
            }
            $out[] = $text;
        }
        return $out;
    }

    /** @return list<list<mixed>> */
    private function parseSheet(string $xml): array
    {
        $doc = simplexml_load_string($xml);
        if ($doc === false) {
            return [];
        }

        $grid = [];
        if (!isset($doc->sheetData->row)) {
            return $grid;
        }

        foreach ($doc->sheetData->row as $row) {
            $r = (int) $row['r'];
            if (!isset($grid[$r])) {
                $grid[$r] = [];
            }
            foreach ($row->c as $cell) {
                $ref = (string) $cell['r'];
                if (!preg_match('/^([A-Z]+)(\d+)$/', $ref, $m)) {
                    continue;
                }
                $col = $this->columnIndex($m[1]);
                $grid[$r][$col] = $this->cellValue($cell);
            }
        }

        ksort($grid);
        return $grid;
    }

    private function cellValue(SimpleXMLElement $cell): mixed
    {
        $type = (string) ($cell['t'] ?? '');
        $v = isset($cell->v) ? (string) $cell->v : '';

        if ($type === 's') {
            return $this->sharedStrings[(int) $v] ?? '';
        }
        if ($type === 'inlineStr' && isset($cell->is->t)) {
            return (string) $cell->is->t;
        }
        if ($v === '') {
            return null;
        }
        if (is_numeric($v)) {
            return str_contains($v, '.') ? (float) $v : (int) $v;
        }
        return $v;
    }

    private function columnIndex(string $letters): int
    {
        $n = 0;
        $len = strlen($letters);
        for ($i = 0; $i < $len; $i++) {
            $n = $n * 26 + (ord($letters[$i]) - 64);
        }
        return $n;
    }

    public function getCell(array $rows, int $row, int $col): mixed
    {
        return $rows[$row][$col] ?? null;
    }
}
