/**
 * Методы для работы с CAPICOM
 * 
 * http://www.microsoft.com/ru-ru/download/details.aspx?id=3207
 */
(function($) {

$.capicom = $.capicom || {};

// Cryptography enumerations
// http://msdn.microsoft.com/en-us/library/aa380250(v=vs.85).aspx
$.capicom.CAPICOM_CURRENT_USER_STORE = 2; // http://msdn.microsoft.com/en-us/library/aa375743(v=vs.85).aspx
$.capicom.CAPICOM_STORE_OPEN_READ_ONLY = 0; // http://msdn.microsoft.com/en-us/library/aa375747(v=vs.85).aspx
$.capicom.CAPICOM_CERTIFICATE_FIND_TIME_VALID = 9; // http://msdn.microsoft.com/en-us/library/aa375642(v=vs.85).aspx
$.capicom.CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0; // http://msdn.microsoft.com/en-us/library/aa375642(v=vs.85).aspx
$.capicom.CAPICOM_CERT_INFO_SUBJECT_SIMPLE_NAME = 0; // http://msdn.microsoft.com/en-us/library/aa375652(v=vs.85).aspx
$.capicom.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME = 0; // http://msdn.microsoft.com/en-us/library/windows/desktop/aa375631(v=vs.85).aspx
$.capicom.CAPICOM_ENCODE_BASE64 = 0; // http://msdn.microsoft.com/en-us/library/aa375673(v=vs.85) 
$.capicom.CAPICOM_ENCODE_BINARY = 1; // http://msdn.microsoft.com/en-us/library/aa375673(v=vs.85) 
$.capicom.CAPICOM_VERIFY_SIGNATURE_AND_CERTIFICATE = 1; // http://msdn.microsoft.com/en-us/library/aa375740(v=vs.85).aspx
$.capicom.CAPICOM_E_CANCELLED = -2138568446;
$.capicom.CAPICOM_E_NOT_INSTALLED = -2146827859;

/**
 * Получение списка действительных сертификатов
 */
$.capicom.getCertificatesList = function() {
    try {
        // инициализация объекта CAPICOM.Store: предоставляет методы для работы с хранилищем сертификатов
        var myStore = new ActiveXObject("CAPICOM.Store");
        // открывает хранилище персональных сертификатов
        myStore.Open($.capicom.CAPICOM_CURRENT_USER_STORE, "My", $.capicom.CAPICOM_STORE_OPEN_READ_ONLY);

        // поиск всех действующих сертификатов (фильтр по дате)
        // доступные фильтры: http://msdn.microsoft.com/en-us/library/aa375642(v=vs.85).aspx
        var filteredCertificates = myStore.Certificates.Find($.capicom.CAPICOM_CERTIFICATE_FIND_TIME_VALID);
        var result = [];
        for ( var i = 1; i <= filteredCertificates.Count; i++) {
            var cert = filteredCertificates.Item(i);
            var certInfo = {
                thumbprint : cert.Thumbprint, // строка, содержащая SHA-1 хеш от сертификата
                displayName : cert.GetInfo($.capicom.CAPICOM_CERT_INFO_SUBJECT_SIMPLE_NAME)
            };
            result.push(certInfo);
        }
        return result;
    } catch (e) {
        return [];
    }
};

/**
 * Поиск сертификата в хранилище сертификатов
 * 
 * @param hash отпечаток сертиката
 */
$.capicom.findCertificateByHash = function(hash) {
    try {
        // инициализация объекта CAPICOM.Store: предоставляет методы для работы с хранилищем сертификатов
        var store = new ActiveXObject("CAPICOM.Store");
        // открывает хранилище персональных сертификатов
        store.Open($.capicom.CAPICOM_CURRENT_USER_STORE, "My", $.capicom.CAPICOM_STORE_OPEN_READ_ONLY);
        // поиск сертификатов, хеш которых соответствует заданному отпечатку (thumbprint), в хранилище сертификатов
        var filteredCertificates = store.Certificates.Find($.capicom.CAPICOM_CERTIFICATE_FIND_SHA1_HASH, hash);
        // инициализация объекта CAPICOM.Signer: для указания ключа подписи
        var signer = new ActiveXObject("CAPICOM.Signer");
        signer.Certificate = filteredCertificates.Item(1);
        return signer;
    } catch (e) {
        if (e.number != CAPICOM_E_CANCELLED) {
            return new ActiveXObject("CAPICOM.Signer");
        }
    }
};

/**
 * Подпись данных
 * 
 * @param rawData бинарные данные для подписи
 * @param detached флаг открепленной подписи
 * @param cert_hash отпечаток сертификата для подписи
 * @return byteArray
 */
$.capicom.sign = function(rawData, detached, cert_hash) {
    try {
        // инициализация объекта CAPICOM.SignedData: предоставляет методы для создания и верификации подписи
        var signedData = new ActiveXObject("CAPICOM.SignedData");
        // инициализация объекта CAPICOM.Utilities
        // http://msdn.microsoft.com/en-us/library/windows/desktop/aa388176(v=vs.85).aspx
        var utils = new ActiveXObject("CAPICOM.Utilities");

        // подписываемые данные
        signedData.Content = rawData;

        // поиск сертификата ключа подписи в хранилище сертификатов
        var signer = $.capicom.findCertificateByHash(cert_hash);

        // время подписи
        var timeAttribute = new ActiveXObject("CAPICOM.Attribute");
        var today = new Date();
        timeAttribute.Name = $.capicom.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME;
        timeAttribute.Value = today.getVarDate();
        today = null;
        signer.AuthenticatedAttributes.Add(timeAttribute);

        // возов метода SignedData.Sign
        // signer - сертификат ключа подписи
        // detached - флаг открепленной подписи (исходное сообщение не включается в итоговый CMS-контейнер)
        // detached = false - прикрепленная подпись (исходное сообщение вкючено в CMS-контейнер)
        // CAPICOM_ENCODE_BINARY - подпись будет сформирована в виде бинарной последовательности
        // http://msdn.microsoft.com/en-us/library/aa387726(v=vs.85)
        var signature = signedData.Sign(signer, detached, $.capicom.CAPICOM_ENCODE_BINARY);
        // конвертируем полученную подпись в ByteArray для дальнейшего сохранения в файловой системе
        return utils.BinaryStringToByteArray(signature);
    } catch (e) {
        return false;
    }
};

/**
 * Проверка подписи
 * 
 * @param signature CMS-контейнер
 */
$.capicom.verify = function(signature) {
    // инициализация объекта CAPICOM.SignedData: предоставляет методы для создания и верификации подписи
    var signedData = new ActiveXObject("CAPICOM.SignedData");
    var utils = new ActiveXObject("CAPICOM.Utilities");

    try {
        // http://msdn.microsoft.com/en-us/library/windows/desktop/aa387728(v=vs.85).aspx
        // signature - cms-конейнер, содержащий подпись
        // CAPICOM_VERIFY_SIGNATURE_AND_CERTIFICATE - проверка хеша и сертифката
        var res = signedData.Verify(signature, false, $.capicom.CAPICOM_VERIFY_SIGNATURE_AND_CERTIFICATE);
        var result = {
            rawData: utils.BinaryStringToByteArray(signedData.Content), // извлекаем исходные данные
            success: true,
        };
    } catch(e) {
       // сообщение об ошибке в случае невалидной подписи
       var result = {
           error: e,
           success: false
       };
    }

    return result;
};
})(jQuery);