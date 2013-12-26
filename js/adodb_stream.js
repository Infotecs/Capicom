/**
 * Чтение/запись бинарных файлов
 * http://msdn.microsoft.com/en-us/library/windows/desktop/ms675032(v=vs.85).aspx
 */
(function() {
$.adodb_stream = $.adodb_stream || {};

$.adodb_stream.adTypeBinary = 1;
$.adodb_stream.adSaveCreateOverWrite = 2;

/**
 * Чтение бинарного файла
 */
$.adodb_stream.read_binary = function(filename) {
    var binaryStream = new ActiveXObject("ADODB.Stream");
    // http://msdn.microsoft.com/en-us/library/windows/desktop/ms681553(v=vs.85).aspx
    binaryStream.Type = $.adodb_stream.adTypeBinary;
    binaryStream.Open();
    binaryStream.LoadFromFile(filename);
    var content = binaryStream.Read();
    binaryStream.Close();

    return content;
}

/**
 * Запись бинарных данных в файл
 */
$.adodb_stream.write_binary = function(filename, content) {
    var binaryStream = new ActiveXObject("ADODB.Stream");
    binaryStream.Type = $.adodb_stream.adTypeBinary;
    binaryStream.Open();
    binaryStream.Write(content);
    // http://msdn.microsoft.com/en-us/library/windows/desktop/ms676745(v=vs.85).aspx
    binaryStream.SaveToFile(filename, $.adodb_stream.adSaveCreateOverWrite);
    binaryStream.Close();
};
})(jQuery);