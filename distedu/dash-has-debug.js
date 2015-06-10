//COPYRIGHT/* Last build : @@TIMESTAMP / git revision : @@REVISION */
function X2JS(matchers, attrPrefix, ignoreRoot) {
    if (attrPrefix === null || attrPrefix === undefined) {
        attrPrefix = "_";
    }
    if (ignoreRoot === null || ignoreRoot === undefined) {
        ignoreRoot = false;
    }
    var VERSION = "1.0.11";
    var escapeMode = false;
    var DOMNodeTypes = {
        ELEMENT_NODE: 1,
        TEXT_NODE: 3,
        CDATA_SECTION_NODE: 4,
        COMMENT_NODE: 8,
        DOCUMENT_NODE: 9
    };
    function getNodeLocalName(node) {
        var nodeLocalName = node.localName;
        if (nodeLocalName == null) nodeLocalName = node.baseName;
        if (nodeLocalName == null || nodeLocalName == "") nodeLocalName = node.nodeName;
        return nodeLocalName;
    }
    function getNodePrefix(node) {
        return node.prefix;
    }
    function escapeXmlChars(str) {
        if (typeof str == "string") return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;"); else return str;
    }
    function unescapeXmlChars(str) {
        return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/");
    }
    function parseDOMChildren(node) {
        if (node.nodeType == DOMNodeTypes.DOCUMENT_NODE) {
            var result, child = node.firstChild, i, len;
            for (i = 0, len = node.childNodes.length; i < len; i += 1) {
                if (node.childNodes[i].nodeType !== DOMNodeTypes.COMMENT_NODE) {
                    child = node.childNodes[i];
                    break;
                }
            }
            if (ignoreRoot) {
                result = parseDOMChildren(child);
            } else {
                result = {};
                var childName = getNodeLocalName(child);
                result[childName] = parseDOMChildren(child);
            }
            return result;
        } else if (node.nodeType == DOMNodeTypes.ELEMENT_NODE) {
            var result = new Object();
            result.__cnt = 0;
            var nodeChildren = node.childNodes;
            for (var cidx = 0; cidx < nodeChildren.length; cidx++) {
                var child = nodeChildren.item(cidx);
                var childName = getNodeLocalName(child);
                result.__cnt++;
                if (result[childName] == null) {
                    result[childName] = parseDOMChildren(child);
                    result[childName + "_asArray"] = new Array(1);
                    result[childName + "_asArray"][0] = result[childName];
                } else {
                    if (result[childName] != null) {
                        if (!(result[childName] instanceof Array)) {
                            var tmpObj = result[childName];
                            result[childName] = new Array();
                            result[childName][0] = tmpObj;
                            result[childName + "_asArray"] = result[childName];
                        }
                    }
                    var aridx = 0;
                    while (result[childName][aridx] != null) aridx++;
                    result[childName][aridx] = parseDOMChildren(child);
                }
            }
            for (var aidx = 0; aidx < node.attributes.length; aidx++) {
                var attr = node.attributes.item(aidx);
                result.__cnt++;
                var value2 = attr.value;
                for (var m = 0, ml = matchers.length; m < ml; m++) {
                    var matchobj = matchers[m];
                    if (matchobj.test.call(this, attr.value)) value2 = matchobj.converter.call(this, attr.value);
                }
                result[attrPrefix + attr.name] = value2;
            }
            var nodePrefix = getNodePrefix(node);
            if (nodePrefix != null && nodePrefix != "") {
                result.__cnt++;
                result.__prefix = nodePrefix;
            }
            if (result.__cnt == 1 && result["#text"] != null) {
                result = result["#text"];
            }
            if (result["#text"] != null) {
                result.__text = result["#text"];
                if (escapeMode) result.__text = unescapeXmlChars(result.__text);
                delete result["#text"];
                delete result["#text_asArray"];
            }
            if (result["#cdata-section"] != null) {
                result.__cdata = result["#cdata-section"];
                delete result["#cdata-section"];
                delete result["#cdata-section_asArray"];
            }
            if (result.__text != null || result.__cdata != null) {
                result.toString = function() {
                    return (this.__text != null ? this.__text : "") + (this.__cdata != null ? this.__cdata : "");
                };
            }
            return result;
        } else if (node.nodeType == DOMNodeTypes.TEXT_NODE || node.nodeType == DOMNodeTypes.CDATA_SECTION_NODE) {
            return node.nodeValue;
        } else if (node.nodeType == DOMNodeTypes.COMMENT_NODE) {
            return null;
        }
    }
    function startTag(jsonObj, element, attrList, closed) {
        var resultStr = "<" + (jsonObj != null && jsonObj.__prefix != null ? jsonObj.__prefix + ":" : "") + element;
        if (attrList != null) {
            for (var aidx = 0; aidx < attrList.length; aidx++) {
                var attrName = attrList[aidx];
                var attrVal = jsonObj[attrName];
                resultStr += " " + attrName.substr(1) + "='" + attrVal + "'";
            }
        }
        if (!closed) resultStr += ">"; else resultStr += "/>";
        return resultStr;
    }
    function endTag(jsonObj, elementName) {
        return "</" + (jsonObj.__prefix != null ? jsonObj.__prefix + ":" : "") + elementName + ">";
    }
    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }
    function jsonXmlSpecialElem(jsonObj, jsonObjField) {
        if (endsWith(jsonObjField.toString(), "_asArray") || jsonObjField.toString().indexOf("_") == 0 || jsonObj[jsonObjField] instanceof Function) return true; else return false;
    }
    function jsonXmlElemCount(jsonObj) {
        var elementsCnt = 0;
        if (jsonObj instanceof Object) {
            for (var it in jsonObj) {
                if (jsonXmlSpecialElem(jsonObj, it)) continue;
                elementsCnt++;
            }
        }
        return elementsCnt;
    }
    function parseJSONAttributes(jsonObj) {
        var attrList = [];
        if (jsonObj instanceof Object) {
            for (var ait in jsonObj) {
                if (ait.toString().indexOf("__") == -1 && ait.toString().indexOf("_") == 0) {
                    attrList.push(ait);
                }
            }
        }
        return attrList;
    }
    function parseJSONTextAttrs(jsonTxtObj) {
        var result = "";
        if (jsonTxtObj.__cdata != null) {
            result += "<![CDATA[" + jsonTxtObj.__cdata + "]]>";
        }
        if (jsonTxtObj.__text != null) {
            if (escapeMode) result += escapeXmlChars(jsonTxtObj.__text); else result += jsonTxtObj.__text;
        }
        return result;
    }
    function parseJSONTextObject(jsonTxtObj) {
        var result = "";
        if (jsonTxtObj instanceof Object) {
            result += parseJSONTextAttrs(jsonTxtObj);
        } else if (jsonTxtObj != null) {
            if (escapeMode) result += escapeXmlChars(jsonTxtObj); else result += jsonTxtObj;
        }
        return result;
    }
    function parseJSONArray(jsonArrRoot, jsonArrObj, attrList) {
        var result = "";
        if (jsonArrRoot.length == 0) {
            result += startTag(jsonArrRoot, jsonArrObj, attrList, true);
        } else {
            for (var arIdx = 0; arIdx < jsonArrRoot.length; arIdx++) {
                result += startTag(jsonArrRoot[arIdx], jsonArrObj, parseJSONAttributes(jsonArrRoot[arIdx]), false);
                result += parseJSONObject(jsonArrRoot[arIdx]);
                result += endTag(jsonArrRoot[arIdx], jsonArrObj);
            }
        }
        return result;
    }
    function parseJSONObject(jsonObj) {
        var result = "";
        var elementsCnt = jsonXmlElemCount(jsonObj);
        if (elementsCnt > 0) {
            for (var it in jsonObj) {
                if (jsonXmlSpecialElem(jsonObj, it)) continue;
                var subObj = jsonObj[it];
                var attrList = parseJSONAttributes(subObj);
                if (subObj == null || subObj == undefined) {
                    result += startTag(subObj, it, attrList, true);
                } else if (subObj instanceof Object) {
                    if (subObj instanceof Array) {
                        result += parseJSONArray(subObj, it, attrList);
                    } else {
                        var subObjElementsCnt = jsonXmlElemCount(subObj);
                        if (subObjElementsCnt > 0 || subObj.__text != null || subObj.__cdata != null) {
                            result += startTag(subObj, it, attrList, false);
                            result += parseJSONObject(subObj);
                            result += endTag(subObj, it);
                        } else {
                            result += startTag(subObj, it, attrList, true);
                        }
                    }
                } else {
                    result += startTag(subObj, it, attrList, false);
                    result += parseJSONTextObject(subObj);
                    result += endTag(subObj, it);
                }
            }
        }
        result += parseJSONTextObject(jsonObj);
        return result;
    }
    this.parseXmlString = function(xmlDocStr) {
        var xmlDoc;
        if (window.DOMParser) {
            try {
                var parser = new window.DOMParser();
                xmlDoc = parser.parseFromString(xmlDocStr, "text/xml");
            } catch (e) {
                return null;
            }
        } else {
            if (xmlDocStr.indexOf("<?") == 0) {
                xmlDocStr = xmlDocStr.substr(xmlDocStr.indexOf("?>") + 2);
            }
            xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = "false";
            xmlDoc.loadXML(xmlDocStr);
            if (xmlDoc.parseError.errorCode != 0) {
                return null;
            }
        }
        return xmlDoc;
    };
    this.xml2json = function(xmlDoc) {
        return parseDOMChildren(xmlDoc);
    };
    this.xml_str2json = function(xmlDocStr) {
        var xmlDoc = this.parseXmlString(xmlDocStr);
        return this.xml2json(xmlDoc);
    };
    this.json2xml_str = function(jsonObj) {
        return parseJSONObject(jsonObj);
    };
    this.json2xml = function(jsonObj) {
        var xmlDocStr = this.json2xml_str(jsonObj);
        return this.parseXmlString(xmlDocStr);
    };
    this.getVersion = function() {
        return VERSION;
    };
    this.escapeMode = function(enabled) {
        escapeMode = enabled;
    };
}

function ObjectIron(map) {
    var lookup;
    lookup = [];
    for (i = 0, len = map.length; i < len; i += 1) {
        if (map[i].isRoot) {
            lookup.push("root");
        } else {
            lookup.push(map[i].name);
        }
    }
    var mergeValues = function(parentItem, childItem) {
        var name, parentValue, childValue;
        if (parentItem === null || childItem === null) {
            return;
        }
        for (name in parentItem) {
            if (parentItem.hasOwnProperty(name)) {
                if (!childItem.hasOwnProperty(name)) {
                    childItem[name] = parentItem[name];
                }
            }
        }
    }, mapProperties = function(properties, parent, child) {
        var i, len, property, parentValue, childValue;
        if (properties === null || properties.length === 0) {
            return;
        }
        for (i = 0, len = properties.length; i < len; i += 1) {
            property = properties[i];
            if (parent.hasOwnProperty(property.name)) {
                if (child.hasOwnProperty(property.name)) {
                    if (property.merge) {
                        parentValue = parent[property.name];
                        childValue = child[property.name];
                        if (typeof parentValue === "object" && typeof childValue === "object") {
                            mergeValues(parentValue, childValue);
                        } else {
                            if (property.mergeFunction != null) {
                                child[property.name] = property.mergeFunction(parentValue, childValue);
                            } else {
                                child[property.name] = parentValue + childValue;
                            }
                        }
                    }
                } else {
                    child[property.name] = parent[property.name];
                }
            }
        }
    }, mapItem = function(obj, node) {
        var item = obj, i, len, v, len2, array, childItem, childNode, property;
        if (item.children === null || item.children.length === 0) {
            return;
        }
        for (i = 0, len = item.children.length; i < len; i += 1) {
            childItem = item.children[i];
            if (node.hasOwnProperty(childItem.name)) {
                if (childItem.isArray) {
                    array = node[childItem.name + "_asArray"];
                    for (v = 0, len2 = array.length; v < len2; v += 1) {
                        childNode = array[v];
                        mapProperties(item.properties, node, childNode);
                        mapItem(childItem, childNode);
                    }
                } else {
                    childNode = node[childItem.name];
                    mapProperties(item.properties, node, childNode);
                    mapItem(childItem, childNode);
                }
            }
        }
    }, performMapping = function(source) {
        var i, len, pi, pp, item, node, array;
        if (source === null) {
            return source;
        }
        if (typeof source !== "object") {
            return source;
        }
        for (i = 0, len = lookup.length; i < len; i += 1) {
            if (lookup[i] === "root") {
                item = map[i];
                node = source;
                mapItem(item, node);
            }
        }
        for (pp in source) {
            if (source.hasOwnProperty(pp)) {
                pi = lookup.indexOf(pp);
                if (pi !== -1) {
                    item = map[pi];
                    if (item.isArray) {
                        array = source[pp + "_asArray"];
                        for (i = 0, len = array.length; i < len; i += 1) {
                            node = array[i];
                            mapItem(item, node);
                        }
                    } else {
                        node = source[pp];
                        mapItem(item, node);
                    }
                }
                performMapping(source[pp]);
            }
        }
        return source;
    };
    return {
        run: performMapping
    };
}

(function(scope) {
    "use strict";
    var dijon = {
        VERSION: "0.5.3"
    };
    dijon.System = function() {
        this._mappings = {};
        this._outlets = {};
        this._handlers = {};
        this.strictInjections = true;
        this.autoMapOutlets = false;
        this.postInjectionHook = "setup";
    };
    dijon.System.prototype = {
        _createAndSetupInstance: function(key, Clazz) {
            var instance = new Clazz();
            this.injectInto(instance, key);
            return instance;
        },
        _retrieveFromCacheOrCreate: function(key, overrideRules) {
            if (typeof overrideRules === "undefined") {
                overrideRules = false;
            }
            var output;
            if (this._mappings.hasOwnProperty(key)) {
                var config = this._mappings[key];
                if (!overrideRules && config.isSingleton) {
                    if (config.object == null) {
                        config.object = this._createAndSetupInstance(key, config.clazz);
                    }
                    output = config.object;
                } else {
                    if (config.clazz) {
                        output = this._createAndSetupInstance(key, config.clazz);
                    } else {
                        output = config.object;
                    }
                }
            } else {
                throw new Error(1e3);
            }
            return output;
        },
        mapOutlet: function(sourceKey, targetKey, outletName) {
            if (typeof sourceKey === "undefined") {
                throw new Error(1010);
            }
            targetKey = targetKey || "global";
            outletName = outletName || sourceKey;
            if (!this._outlets.hasOwnProperty(targetKey)) {
                this._outlets[targetKey] = {};
            }
            this._outlets[targetKey][outletName] = sourceKey;
            return this;
        },
        getObject: function(key) {
            if (typeof key === "undefined") {
                throw new Error(1020);
            }
            return this._retrieveFromCacheOrCreate(key);
        },
        mapValue: function(key, useValue) {
            if (typeof key === "undefined") {
                throw new Error(1030);
            }
            this._mappings[key] = {
                clazz: null,
                object: useValue,
                isSingleton: true
            };
            if (this.autoMapOutlets) {
                this.mapOutlet(key);
            }
            if (this.hasMapping(key)) {
                this.injectInto(useValue, key);
            }
            return this;
        },
        hasMapping: function(key) {
            if (typeof key === "undefined") {
                throw new Error(1040);
            }
            return this._mappings.hasOwnProperty(key);
        },
        mapClass: function(key, clazz) {
            if (typeof key === "undefined") {
                throw new Error(1050);
            }
            if (typeof clazz === "undefined") {
                throw new Error(1051);
            }
            this._mappings[key] = {
                clazz: clazz,
                object: null,
                isSingleton: false
            };
            if (this.autoMapOutlets) {
                this.mapOutlet(key);
            }
            return this;
        },
        mapSingleton: function(key, clazz) {
            if (typeof key === "undefined") {
                throw new Error(1060);
            }
            if (typeof clazz === "undefined") {
                throw new Error(1061);
            }
            this._mappings[key] = {
                clazz: clazz,
                object: null,
                isSingleton: true
            };
            if (this.autoMapOutlets) {
                this.mapOutlet(key);
            }
            return this;
        },
        instantiate: function(key) {
            if (typeof key === "undefined") {
                throw new Error(1070);
            }
            return this._retrieveFromCacheOrCreate(key, true);
        },
        injectInto: function(instance, key) {
            if (typeof instance === "undefined") {
                throw new Error(1080);
            }
            if (typeof instance === "object") {
                var o = [];
                if (this._outlets.hasOwnProperty("global")) {
                    o.push(this._outlets["global"]);
                }
                if (typeof key !== "undefined" && this._outlets.hasOwnProperty(key)) {
                    o.push(this._outlets[key]);
                }
                for (var i in o) {
                    var l = o[i];
                    for (var outlet in l) {
                        var source = l[outlet];
                        if (!this.strictInjections || outlet in instance) {
                            instance[outlet] = this.getObject(source);
                        }
                    }
                }
                if ("setup" in instance) {
                    instance.setup.call(instance);
                }
            }
            return this;
        },
        unmap: function(key) {
            if (typeof key === "undefined") {
                throw new Error(1090);
            }
            delete this._mappings[key];
            return this;
        },
        unmapOutlet: function(target, outlet) {
            if (typeof target === "undefined") {
                throw new Error(1100);
            }
            if (typeof outlet === "undefined") {
                throw new Error(1101);
            }
            delete this._outlets[target][outlet];
            return this;
        },
        mapHandler: function(eventName, key, handler, oneShot, passEvent) {
            if (typeof eventName === "undefined") {
                throw new Error(1110);
            }
            key = key || "global";
            handler = handler || eventName;
            if (typeof oneShot === "undefined") {
                oneShot = false;
            }
            if (typeof passEvent === "undefined") {
                passEvent = false;
            }
            if (!this._handlers.hasOwnProperty(eventName)) {
                this._handlers[eventName] = {};
            }
            if (!this._handlers[eventName].hasOwnProperty(key)) {
                this._handlers[eventName][key] = [];
            }
            this._handlers[eventName][key].push({
                handler: handler,
                oneShot: oneShot,
                passEvent: passEvent
            });
            return this;
        },
        unmapHandler: function(eventName, key, handler) {
            if (typeof eventName === "undefined") {
                throw new Error(1120);
            }
            key = key || "global";
            if (this._handlers.hasOwnProperty(eventName) && this._handlers[eventName].hasOwnProperty(key)) {
                var handlers = this._handlers[eventName][key];
                for (var i in handlers) {
                    var config = handlers[i];
                    if (!handler || config.handler === handler) {
                        handlers.splice(i, 1);
                        break;
                    }
                }
            }
            return this;
        },
        notify: function(eventName) {
            if (typeof eventName === "undefined") {
                throw new Error(1130);
            }
            var argsWithEvent = Array.prototype.slice.call(arguments);
            var argsClean = argsWithEvent.slice(1);
            if (this._handlers.hasOwnProperty(eventName)) {
                var handlers = this._handlers[eventName];
                for (var key in handlers) {
                    var configs = handlers[key];
                    var instance;
                    if (key !== "global") {
                        instance = this.getObject(key);
                    }
                    var toBeDeleted = [];
                    var i, n;
                    for (i = 0, n = configs.length; i < n; i++) {
                        var handler;
                        var config = configs[i];
                        if (instance && typeof config.handler === "string") {
                            handler = instance[config.handler];
                        } else {
                            handler = config.handler;
                        }
                        if (config.oneShot) {
                            toBeDeleted.unshift(i);
                        }
                        if (config.passEvent) {
                            handler.apply(instance, argsWithEvent);
                        } else {
                            handler.apply(instance, argsClean);
                        }
                    }
                    for (i = 0, n = toBeDeleted.length; i < n; i++) {
                        configs.splice(toBeDeleted[i], 1);
                    }
                }
            }
            return this;
        }
    };
    scope.dijon = dijon;
})(this);

if (typeof utils == "undefined") {
    var utils = {};
}

if (typeof utils.Math == "undefined") {
    utils.Math = {};
}

utils.Math.to64BitNumber = function(low, high) {
    var highNum, lowNum, expected;
    highNum = new goog.math.Long(0, high);
    lowNum = new goog.math.Long(low, 0);
    expected = highNum.add(lowNum);
    return expected.toNumber();
};

goog = {};

goog.math = {};

goog.math.Long = function(low, high) {
    this.low_ = low | 0;
    this.high_ = high | 0;
};

goog.math.Long.IntCache_ = {};

goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
        var cachedObj = goog.math.Long.IntCache_[value];
        if (cachedObj) {
            return cachedObj;
        }
    }
    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
        goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
};

goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
        return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
        return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
        return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
        return goog.math.Long.fromNumber(-value).negate();
    } else {
        return new goog.math.Long(value % goog.math.Long.TWO_PWR_32_DBL_ | 0, value / goog.math.Long.TWO_PWR_32_DBL_ | 0);
    }
};

goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
};

goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
        throw Error("number format error: empty string");
    }
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
        throw Error("radix out of range: " + radix);
    }
    if (str.charAt(0) == "-") {
        return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf("-") >= 0) {
        throw Error('number format error: interior "-" character: ' + str);
    }
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));
    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
        var size = Math.min(8, str.length - i);
        var value = parseInt(str.substring(i, i + size), radix);
        if (size < 8) {
            var power = goog.math.Long.fromNumber(Math.pow(radix, size));
            result = result.multiply(power).add(goog.math.Long.fromNumber(value));
        } else {
            result = result.multiply(radixToPower);
            result = result.add(goog.math.Long.fromNumber(value));
        }
    }
    return result;
};

goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;

goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;

goog.math.Long.TWO_PWR_32_DBL_ = goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;

goog.math.Long.TWO_PWR_31_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ / 2;

goog.math.Long.TWO_PWR_48_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;

goog.math.Long.TWO_PWR_64_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;

goog.math.Long.TWO_PWR_63_DBL_ = goog.math.Long.TWO_PWR_64_DBL_ / 2;

goog.math.Long.ZERO = goog.math.Long.fromInt(0);

goog.math.Long.ONE = goog.math.Long.fromInt(1);

goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);

goog.math.Long.MAX_VALUE = goog.math.Long.fromBits(4294967295 | 0, 2147483647 | 0);

goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 2147483648 | 0);

goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);

goog.math.Long.prototype.toInt = function() {
    return this.low_;
};

goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned();
};

goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
        throw Error("radix out of range: " + radix);
    }
    if (this.isZero()) {
        return "0";
    }
    if (this.isNegative()) {
        if (this.equals(goog.math.Long.MIN_VALUE)) {
            var radixLong = goog.math.Long.fromNumber(radix);
            var div = this.div(radixLong);
            var rem = div.multiply(radixLong).subtract(this);
            return div.toString(radix) + rem.toInt().toString(radix);
        } else {
            return "-" + this.negate().toString(radix);
        }
    }
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));
    var rem = this;
    var result = "";
    while (true) {
        var remDiv = rem.div(radixToPower);
        var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
        var digits = intval.toString(radix);
        rem = remDiv;
        if (rem.isZero()) {
            return digits + result;
        } else {
            while (digits.length < 6) {
                digits = "0" + digits;
            }
            result = "" + digits + result;
        }
    }
};

goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
};

goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
};

goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return this.low_ >= 0 ? this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
};

goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
        if (this.equals(goog.math.Long.MIN_VALUE)) {
            return 64;
        } else {
            return this.negate().getNumBitsAbs();
        }
    } else {
        var val = this.high_ != 0 ? this.high_ : this.low_;
        for (var bit = 31; bit > 0; bit--) {
            if ((val & 1 << bit) != 0) {
                break;
            }
        }
        return this.high_ != 0 ? bit + 33 : bit + 1;
    }
};

goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
};

goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
};

goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
};

goog.math.Long.prototype.equals = function(other) {
    return this.high_ == other.high_ && this.low_ == other.low_;
};

goog.math.Long.prototype.notEquals = function(other) {
    return this.high_ != other.high_ || this.low_ != other.low_;
};

goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
};

goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
};

goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
};

goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
};

goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
        return 0;
    }
    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
        return -1;
    }
    if (!thisNeg && otherNeg) {
        return 1;
    }
    if (this.subtract(other).isNegative()) {
        return -1;
    } else {
        return 1;
    }
};

goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.MIN_VALUE;
    } else {
        return this.not().add(goog.math.Long.ONE);
    }
};

goog.math.Long.prototype.add = function(other) {
    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 65535;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 65535;
    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 65535;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 65535;
    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 65535;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 65535;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 65535;
    c48 += a48 + b48;
    c48 &= 65535;
    return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
};

goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
};

goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
        return goog.math.Long.ZERO;
    } else if (other.isZero()) {
        return goog.math.Long.ZERO;
    }
    if (this.equals(goog.math.Long.MIN_VALUE)) {
        return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }
    if (this.isNegative()) {
        if (other.isNegative()) {
            return this.negate().multiply(other.negate());
        } else {
            return this.negate().multiply(other).negate();
        }
    } else if (other.isNegative()) {
        return this.multiply(other.negate()).negate();
    }
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) && other.lessThan(goog.math.Long.TWO_PWR_24_)) {
        return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }
    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 65535;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 65535;
    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 65535;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 65535;
    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 65535;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 65535;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 65535;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 65535;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 65535;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 65535;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 65535;
    return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
};

goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
        throw Error("division by zero");
    } else if (this.isZero()) {
        return goog.math.Long.ZERO;
    }
    if (this.equals(goog.math.Long.MIN_VALUE)) {
        if (other.equals(goog.math.Long.ONE) || other.equals(goog.math.Long.NEG_ONE)) {
            return goog.math.Long.MIN_VALUE;
        } else if (other.equals(goog.math.Long.MIN_VALUE)) {
            return goog.math.Long.ONE;
        } else {
            var halfThis = this.shiftRight(1);
            var approx = halfThis.div(other).shiftLeft(1);
            if (approx.equals(goog.math.Long.ZERO)) {
                return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
            } else {
                var rem = this.subtract(other.multiply(approx));
                var result = approx.add(rem.div(other));
                return result;
            }
        }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ZERO;
    }
    if (this.isNegative()) {
        if (other.isNegative()) {
            return this.negate().div(other.negate());
        } else {
            return this.negate().div(other).negate();
        }
    } else if (other.isNegative()) {
        return this.div(other.negate()).negate();
    }
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
        var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));
        var log2 = Math.ceil(Math.log(approx) / Math.LN2);
        var delta = log2 <= 48 ? 1 : Math.pow(2, log2 - 48);
        var approxRes = goog.math.Long.fromNumber(approx);
        var approxRem = approxRes.multiply(other);
        while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
            approx -= delta;
            approxRes = goog.math.Long.fromNumber(approx);
            approxRem = approxRes.multiply(other);
        }
        if (approxRes.isZero()) {
            approxRes = goog.math.Long.ONE;
        }
        res = res.add(approxRes);
        rem = rem.subtract(approxRem);
    }
    return res;
};

goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
};

goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
};

goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_, this.high_ & other.high_);
};

goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_, this.high_ | other.high_);
};

goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_);
};

goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
        return this;
    } else {
        var low = this.low_;
        if (numBits < 32) {
            var high = this.high_;
            return goog.math.Long.fromBits(low << numBits, high << numBits | low >>> 32 - numBits);
        } else {
            return goog.math.Long.fromBits(0, low << numBits - 32);
        }
    }
};

goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
        return this;
    } else {
        var high = this.high_;
        if (numBits < 32) {
            var low = this.low_;
            return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >> numBits);
        } else {
            return goog.math.Long.fromBits(high >> numBits - 32, high >= 0 ? 0 : -1);
        }
    }
};

goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
        return this;
    } else {
        var high = this.high_;
        if (numBits < 32) {
            var low = this.low_;
            return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >>> numBits);
        } else if (numBits == 32) {
            return goog.math.Long.fromBits(high, 0);
        } else {
            return goog.math.Long.fromBits(high >>> numBits - 32, 0);
        }
    }
};

var UTF8 = {};

UTF8.encode = function(s) {
    var u = [];
    for (var i = 0; i < s.length; ++i) {
        var c = s.charCodeAt(i);
        if (c < 128) {
            u.push(c);
        } else if (c < 2048) {
            u.push(192 | c >> 6);
            u.push(128 | 63 & c);
        } else if (c < 65536) {
            u.push(224 | c >> 12);
            u.push(128 | 63 & c >> 6);
            u.push(128 | 63 & c);
        } else {
            u.push(240 | c >> 18);
            u.push(128 | 63 & c >> 12);
            u.push(128 | 63 & c >> 6);
            u.push(128 | 63 & c);
        }
    }
    return u;
};

UTF8.decode = function(u) {
    var a = [];
    var i = 0;
    while (i < u.length) {
        var v = u[i++];
        if (v < 128) {} else if (v < 224) {
            v = (31 & v) << 6;
            v |= 63 & u[i++];
        } else if (v < 240) {
            v = (15 & v) << 12;
            v |= (63 & u[i++]) << 6;
            v |= 63 & u[i++];
        } else {
            v = (7 & v) << 18;
            v |= (63 & u[i++]) << 12;
            v |= (63 & u[i++]) << 6;
            v |= 63 & u[i++];
        }
        a.push(String.fromCharCode(v));
    }
    return a.join("");
};

var BASE64 = {};

(function(T) {
    var encodeArray = function(u) {
        var i = 0;
        var a = [];
        var n = 0 | u.length / 3;
        while (0 < n--) {
            var v = (u[i] << 16) + (u[i + 1] << 8) + u[i + 2];
            i += 3;
            a.push(T.charAt(63 & v >> 18));
            a.push(T.charAt(63 & v >> 12));
            a.push(T.charAt(63 & v >> 6));
            a.push(T.charAt(63 & v));
        }
        if (2 == u.length - i) {
            var v = (u[i] << 16) + (u[i + 1] << 8);
            a.push(T.charAt(63 & v >> 18));
            a.push(T.charAt(63 & v >> 12));
            a.push(T.charAt(63 & v >> 6));
            a.push("=");
        } else if (1 == u.length - i) {
            var v = u[i] << 16;
            a.push(T.charAt(63 & v >> 18));
            a.push(T.charAt(63 & v >> 12));
            a.push("==");
        }
        return a.join("");
    };
    var R = function() {
        var a = [];
        for (var i = 0; i < T.length; ++i) {
            a[T.charCodeAt(i)] = i;
        }
        a["=".charCodeAt(0)] = 0;
        return a;
    }();
    var decodeArray = function(s) {
        var i = 0;
        var u = [];
        var n = 0 | s.length / 4;
        while (0 < n--) {
            var v = (R[s.charCodeAt(i)] << 18) + (R[s.charCodeAt(i + 1)] << 12) + (R[s.charCodeAt(i + 2)] << 6) + R[s.charCodeAt(i + 3)];
            u.push(255 & v >> 16);
            u.push(255 & v >> 8);
            u.push(255 & v);
            i += 4;
        }
        if (u) {
            if ("=" == s.charAt(i - 2)) {
                u.pop();
                u.pop();
            } else if ("=" == s.charAt(i - 1)) {
                u.pop();
            }
        }
        return u;
    };
    var ASCII = {};
    ASCII.encode = function(s) {
        var u = [];
        for (var i = 0; i < s.length; ++i) {
            u.push(s.charCodeAt(i));
        }
        return u;
    };
    ASCII.decode = function(u) {
        for (var i = 0; i < s.length; ++i) {
            a[i] = String.fromCharCode(a[i]);
        }
        return a.join("");
    };
    BASE64.decodeArray = function(s) {
        var u = decodeArray(s);
        return new Uint8Array(u);
    };
    BASE64.encodeASCII = function(s) {
        var u = ASCII.encode(s);
        return encodeArray(u);
    };
    BASE64.decodeASCII = function(s) {
        var a = decodeArray(s);
        return ASCII.decode(a);
    };
    BASE64.encode = function(s) {
        var u = UTF8.encode(s);
        return encodeArray(u);
    };
    BASE64.decode = function(s) {
        var u = decodeArray(s);
        return UTF8.decode(u);
    };
})("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");

if (undefined === btoa) {
    var btoa = BASE64.encode;
}

if (undefined === atob) {
    var atob = BASE64.decode;
}

if (!Array.prototype.push) {
    Array.prototype.push = function() {
        for (var i = 0, len = arguments.length; i < len; i++) {
            this[this.length] = arguments[i];
        }
        return this.length;
    };
}

if (!Array.prototype.shift) {
    Array.prototype.shift = function() {
        if (this.length > 0) {
            var firstItem = this[0];
            for (var i = 0, len = this.length - 1; i < len; i++) {
                this[i] = this[i + 1];
            }
            this.length = this.length - 1;
            return firstItem;
        }
    };
}

if (!Array.prototype.splice) {
    Array.prototype.splice = function(startIndex, deleteCount) {
        var itemsAfterDeleted = this.slice(startIndex + deleteCount);
        var itemsDeleted = this.slice(startIndex, startIndex + deleteCount);
        this.length = startIndex;
        var argumentsArray = [];
        for (var i = 0, len = arguments.length; i < len; i++) {
            argumentsArray[i] = arguments[i];
        }
        var itemsToAppend = argumentsArray.length > 2 ? itemsAfterDeleted = argumentsArray.slice(2).concat(itemsAfterDeleted) : itemsAfterDeleted;
        for (i = 0, len = itemsToAppend.length; i < len; i++) {
            this.push(itemsToAppend[i]);
        }
        return itemsDeleted;
    };
}

var log4javascript = function() {
    function isUndefined(obj) {
        return typeof obj == "undefined";
    }
    function EventSupport() {}
    EventSupport.prototype = {
        eventTypes: [],
        eventListeners: {},
        setEventTypes: function(eventTypesParam) {
            if (eventTypesParam instanceof Array) {
                this.eventTypes = eventTypesParam;
                this.eventListeners = {};
                for (var i = 0, len = this.eventTypes.length; i < len; i++) {
                    this.eventListeners[this.eventTypes[i]] = [];
                }
            } else {
                handleError("log4javascript.EventSupport [" + this + "]: setEventTypes: eventTypes parameter must be an Array");
            }
        },
        addEventListener: function(eventType, listener) {
            if (typeof listener == "function") {
                if (!array_contains(this.eventTypes, eventType)) {
                    handleError("log4javascript.EventSupport [" + this + "]: addEventListener: no event called '" + eventType + "'");
                }
                this.eventListeners[eventType].push(listener);
            } else {
                handleError("log4javascript.EventSupport [" + this + "]: addEventListener: listener must be a function");
            }
        },
        removeEventListener: function(eventType, listener) {
            if (typeof listener == "function") {
                if (!array_contains(this.eventTypes, eventType)) {
                    handleError("log4javascript.EventSupport [" + this + "]: removeEventListener: no event called '" + eventType + "'");
                }
                array_remove(this.eventListeners[eventType], listener);
            } else {
                handleError("log4javascript.EventSupport [" + this + "]: removeEventListener: listener must be a function");
            }
        },
        dispatchEvent: function(eventType, eventArgs) {
            if (array_contains(this.eventTypes, eventType)) {
                var listeners = this.eventListeners[eventType];
                for (var i = 0, len = listeners.length; i < len; i++) {
                    listeners[i](this, eventType, eventArgs);
                }
            } else {
                handleError("log4javascript.EventSupport [" + this + "]: dispatchEvent: no event called '" + eventType + "'");
            }
        }
    };
    var applicationStartDate = new Date();
    var uniqueId = "log4javascript_" + applicationStartDate.getTime() + "_" + Math.floor(Math.random() * 1e8);
    var emptyFunction = function() {};
    var newLine = "\r\n";
    var pageLoaded = false;
    function Log4JavaScript() {}
    Log4JavaScript.prototype = new EventSupport();
    log4javascript = new Log4JavaScript();
    log4javascript.version = "1.4.6";
    log4javascript.edition = "log4javascript";
    function toStr(obj) {
        if (obj && obj.toString) {
            return obj.toString();
        } else {
            return String(obj);
        }
    }
    function getExceptionMessage(ex) {
        if (ex.message) {
            return ex.message;
        } else if (ex.description) {
            return ex.description;
        } else {
            return toStr(ex);
        }
    }
    function getUrlFileName(url) {
        var lastSlashIndex = Math.max(url.lastIndexOf("/"), url.lastIndexOf("\\"));
        return url.substr(lastSlashIndex + 1);
    }
    function getExceptionStringRep(ex) {
        if (ex) {
            var exStr = "Exception: " + getExceptionMessage(ex);
            try {
                if (ex.lineNumber) {
                    exStr += " on line number " + ex.lineNumber;
                }
                if (ex.fileName) {
                    exStr += " in file " + getUrlFileName(ex.fileName);
                }
            } catch (localEx) {
                logLog.warn("Unable to obtain file and line information for error");
            }
            if (showStackTraces && ex.stack) {
                exStr += newLine + "Stack trace:" + newLine + ex.stack;
            }
            return exStr;
        }
        return null;
    }
    function bool(obj) {
        return Boolean(obj);
    }
    function trim(str) {
        return str.replace(/^\s+/, "").replace(/\s+$/, "");
    }
    function splitIntoLines(text) {
        var text2 = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        return text2.split("\n");
    }
    var urlEncode = typeof window.encodeURIComponent != "undefined" ? function(str) {
        return encodeURIComponent(str);
    } : function(str) {
        return escape(str).replace(/\+/g, "%2B").replace(/"/g, "%22").replace(/'/g, "%27").replace(/\//g, "%2F").replace(/=/g, "%3D");
    };
    var urlDecode = typeof window.decodeURIComponent != "undefined" ? function(str) {
        return decodeURIComponent(str);
    } : function(str) {
        return unescape(str).replace(/%2B/g, "+").replace(/%22/g, '"').replace(/%27/g, "'").replace(/%2F/g, "/").replace(/%3D/g, "=");
    };
    function array_remove(arr, val) {
        var index = -1;
        for (var i = 0, len = arr.length; i < len; i++) {
            if (arr[i] === val) {
                index = i;
                break;
            }
        }
        if (index >= 0) {
            arr.splice(index, 1);
            return true;
        } else {
            return false;
        }
    }
    function array_contains(arr, val) {
        for (var i = 0, len = arr.length; i < len; i++) {
            if (arr[i] == val) {
                return true;
            }
        }
        return false;
    }
    function extractBooleanFromParam(param, defaultValue) {
        if (isUndefined(param)) {
            return defaultValue;
        } else {
            return bool(param);
        }
    }
    function extractStringFromParam(param, defaultValue) {
        if (isUndefined(param)) {
            return defaultValue;
        } else {
            return String(param);
        }
    }
    function extractIntFromParam(param, defaultValue) {
        if (isUndefined(param)) {
            return defaultValue;
        } else {
            try {
                var value = parseInt(param, 10);
                return isNaN(value) ? defaultValue : value;
            } catch (ex) {
                logLog.warn("Invalid int param " + param, ex);
                return defaultValue;
            }
        }
    }
    function extractFunctionFromParam(param, defaultValue) {
        if (typeof param == "function") {
            return param;
        } else {
            return defaultValue;
        }
    }
    function isError(err) {
        return err instanceof Error;
    }
    if (!Function.prototype.apply) {
        Function.prototype.apply = function(obj, args) {
            var methodName = "__apply__";
            if (typeof obj[methodName] != "undefined") {
                methodName += String(Math.random()).substr(2);
            }
            obj[methodName] = this;
            var argsStrings = [];
            for (var i = 0, len = args.length; i < len; i++) {
                argsStrings[i] = "args[" + i + "]";
            }
            var script = "obj." + methodName + "(" + argsStrings.join(",") + ")";
            var returnValue = eval(script);
            delete obj[methodName];
            return returnValue;
        };
    }
    if (!Function.prototype.call) {
        Function.prototype.call = function(obj) {
            var args = [];
            for (var i = 1, len = arguments.length; i < len; i++) {
                args[i - 1] = arguments[i];
            }
            return this.apply(obj, args);
        };
    }
    function getListenersPropertyName(eventName) {
        return "__log4javascript_listeners__" + eventName;
    }
    function addEvent(node, eventName, listener, useCapture, win) {
        win = win ? win : window;
        if (node.addEventListener) {
            node.addEventListener(eventName, listener, useCapture);
        } else if (node.attachEvent) {
            node.attachEvent("on" + eventName, listener);
        } else {
            var propertyName = getListenersPropertyName(eventName);
            if (!node[propertyName]) {
                node[propertyName] = [];
                node["on" + eventName] = function(evt) {
                    evt = getEvent(evt, win);
                    var listenersPropertyName = getListenersPropertyName(eventName);
                    var listeners = this[listenersPropertyName].concat([]);
                    var currentListener;
                    while (currentListener = listeners.shift()) {
                        currentListener.call(this, evt);
                    }
                };
            }
            node[propertyName].push(listener);
        }
    }
    function removeEvent(node, eventName, listener, useCapture) {
        if (node.removeEventListener) {
            node.removeEventListener(eventName, listener, useCapture);
        } else if (node.detachEvent) {
            node.detachEvent("on" + eventName, listener);
        } else {
            var propertyName = getListenersPropertyName(eventName);
            if (node[propertyName]) {
                array_remove(node[propertyName], listener);
            }
        }
    }
    function getEvent(evt, win) {
        win = win ? win : window;
        return evt ? evt : win.event;
    }
    function stopEventPropagation(evt) {
        if (evt.stopPropagation) {
            evt.stopPropagation();
        } else if (typeof evt.cancelBubble != "undefined") {
            evt.cancelBubble = true;
        }
        evt.returnValue = false;
    }
    var logLog = {
        quietMode: false,
        debugMessages: [],
        setQuietMode: function(quietMode) {
            this.quietMode = bool(quietMode);
        },
        numberOfErrors: 0,
        alertAllErrors: false,
        setAlertAllErrors: function(alertAllErrors) {
            this.alertAllErrors = alertAllErrors;
        },
        debug: function(message) {
            this.debugMessages.push(message);
        },
        displayDebug: function() {
            alert(this.debugMessages.join(newLine));
        },
        warn: function(message, exception) {},
        error: function(message, exception) {
            if (++this.numberOfErrors == 1 || this.alertAllErrors) {
                if (!this.quietMode) {
                    var alertMessage = "log4javascript error: " + message;
                    if (exception) {
                        alertMessage += newLine + newLine + "Original error: " + getExceptionStringRep(exception);
                    }
                    alert(alertMessage);
                }
            }
        }
    };
    log4javascript.logLog = logLog;
    log4javascript.setEventTypes([ "load", "error" ]);
    function handleError(message, exception) {
        logLog.error(message, exception);
        log4javascript.dispatchEvent("error", {
            message: message,
            exception: exception
        });
    }
    log4javascript.handleError = handleError;
    var enabled = !(typeof log4javascript_disabled != "undefined" && log4javascript_disabled);
    log4javascript.setEnabled = function(enable) {
        enabled = bool(enable);
    };
    log4javascript.isEnabled = function() {
        return enabled;
    };
    var useTimeStampsInMilliseconds = true;
    log4javascript.setTimeStampsInMilliseconds = function(timeStampsInMilliseconds) {
        useTimeStampsInMilliseconds = bool(timeStampsInMilliseconds);
    };
    log4javascript.isTimeStampsInMilliseconds = function() {
        return useTimeStampsInMilliseconds;
    };
    log4javascript.evalInScope = function(expr) {
        return eval(expr);
    };
    var showStackTraces = false;
    log4javascript.setShowStackTraces = function(show) {
        showStackTraces = bool(show);
    };
    var Level = function(level, name) {
        this.level = level;
        this.name = name;
    };
    Level.prototype = {
        toString: function() {
            return this.name;
        },
        equals: function(level) {
            return this.level == level.level;
        },
        isGreaterOrEqual: function(level) {
            return this.level >= level.level;
        }
    };
    Level.ALL = new Level(Number.MIN_VALUE, "ALL");
    Level.TRACE = new Level(1e4, "TRACE");
    Level.DEBUG = new Level(2e4, "DEBUG");
    Level.INFO = new Level(3e4, "INFO");
    Level.WARN = new Level(4e4, "WARN");
    Level.ERROR = new Level(5e4, "ERROR");
    Level.FATAL = new Level(6e4, "FATAL");
    Level.OFF = new Level(Number.MAX_VALUE, "OFF");
    log4javascript.Level = Level;
    function Timer(name, level) {
        this.name = name;
        this.level = isUndefined(level) ? Level.INFO : level;
        this.start = new Date();
    }
    Timer.prototype.getElapsedTime = function() {
        return new Date().getTime() - this.start.getTime();
    };
    var anonymousLoggerName = "[anonymous]";
    var defaultLoggerName = "[default]";
    var nullLoggerName = "[null]";
    var rootLoggerName = "root";
    function Logger(name) {
        this.name = name;
        this.parent = null;
        this.children = [];
        var appenders = [];
        var loggerLevel = null;
        var isRoot = this.name === rootLoggerName;
        var isNull = this.name === nullLoggerName;
        var appenderCache = null;
        var appenderCacheInvalidated = false;
        this.addChild = function(childLogger) {
            this.children.push(childLogger);
            childLogger.parent = this;
            childLogger.invalidateAppenderCache();
        };
        var additive = true;
        this.getAdditivity = function() {
            return additive;
        };
        this.setAdditivity = function(additivity) {
            var valueChanged = additive != additivity;
            additive = additivity;
            if (valueChanged) {
                this.invalidateAppenderCache();
            }
        };
        this.addAppender = function(appender) {
            if (isNull) {
                handleError("Logger.addAppender: you may not add an appender to the null logger");
            } else {
                if (appender instanceof log4javascript.Appender) {
                    if (!array_contains(appenders, appender)) {
                        appenders.push(appender);
                        appender.setAddedToLogger(this);
                        this.invalidateAppenderCache();
                    }
                } else {
                    handleError("Logger.addAppender: appender supplied ('" + toStr(appender) + "') is not a subclass of Appender");
                }
            }
        };
        this.removeAppender = function(appender) {
            array_remove(appenders, appender);
            appender.setRemovedFromLogger(this);
            this.invalidateAppenderCache();
        };
        this.removeAllAppenders = function() {
            var appenderCount = appenders.length;
            if (appenderCount > 0) {
                for (var i = 0; i < appenderCount; i++) {
                    appenders[i].setRemovedFromLogger(this);
                }
                appenders.length = 0;
                this.invalidateAppenderCache();
            }
        };
        this.getEffectiveAppenders = function() {
            if (appenderCache === null || appenderCacheInvalidated) {
                var parentEffectiveAppenders = isRoot || !this.getAdditivity() ? [] : this.parent.getEffectiveAppenders();
                appenderCache = parentEffectiveAppenders.concat(appenders);
                appenderCacheInvalidated = false;
            }
            return appenderCache;
        };
        this.invalidateAppenderCache = function() {
            appenderCacheInvalidated = true;
            for (var i = 0, len = this.children.length; i < len; i++) {
                this.children[i].invalidateAppenderCache();
            }
        };
        this.log = function(level, params) {
            if (enabled && level.isGreaterOrEqual(this.getEffectiveLevel())) {
                var exception;
                var finalParamIndex = params.length - 1;
                var lastParam = params[finalParamIndex];
                if (params.length > 1 && isError(lastParam)) {
                    exception = lastParam;
                    finalParamIndex--;
                }
                var messages = [];
                for (var i = 0; i <= finalParamIndex; i++) {
                    messages[i] = params[i];
                }
                var loggingEvent = new LoggingEvent(this, new Date(), level, messages, exception);
                this.callAppenders(loggingEvent);
            }
        };
        this.callAppenders = function(loggingEvent) {
            var effectiveAppenders = this.getEffectiveAppenders();
            for (var i = 0, len = effectiveAppenders.length; i < len; i++) {
                effectiveAppenders[i].doAppend(loggingEvent);
            }
        };
        this.setLevel = function(level) {
            if (isRoot && level === null) {
                handleError("Logger.setLevel: you cannot set the level of the root logger to null");
            } else if (level instanceof Level) {
                loggerLevel = level;
            } else {
                handleError("Logger.setLevel: level supplied to logger " + this.name + " is not an instance of log4javascript.Level");
            }
        };
        this.getLevel = function() {
            return loggerLevel;
        };
        this.getEffectiveLevel = function() {
            for (var logger = this; logger !== null; logger = logger.parent) {
                var level = logger.getLevel();
                if (level !== null) {
                    return level;
                }
            }
        };
        this.group = function(name, initiallyExpanded) {
            if (enabled) {
                var effectiveAppenders = this.getEffectiveAppenders();
                for (var i = 0, len = effectiveAppenders.length; i < len; i++) {
                    effectiveAppenders[i].group(name, initiallyExpanded);
                }
            }
        };
        this.groupEnd = function() {
            if (enabled) {
                var effectiveAppenders = this.getEffectiveAppenders();
                for (var i = 0, len = effectiveAppenders.length; i < len; i++) {
                    effectiveAppenders[i].groupEnd();
                }
            }
        };
        var timers = {};
        this.time = function(name, level) {
            if (enabled) {
                if (isUndefined(name)) {
                    handleError("Logger.time: a name for the timer must be supplied");
                } else if (level && !(level instanceof Level)) {
                    handleError("Logger.time: level supplied to timer " + name + " is not an instance of log4javascript.Level");
                } else {
                    timers[name] = new Timer(name, level);
                }
            }
        };
        this.timeEnd = function(name) {
            if (enabled) {
                if (isUndefined(name)) {
                    handleError("Logger.timeEnd: a name for the timer must be supplied");
                } else if (timers[name]) {
                    var timer = timers[name];
                    var milliseconds = timer.getElapsedTime();
                    this.log(timer.level, [ "Timer " + toStr(name) + " completed in " + milliseconds + "ms" ]);
                    delete timers[name];
                } else {
                    logLog.warn("Logger.timeEnd: no timer found with name " + name);
                }
            }
        };
        this.assert = function(expr) {
            if (enabled && !expr) {
                var args = [];
                for (var i = 1, len = arguments.length; i < len; i++) {
                    args.push(arguments[i]);
                }
                args = args.length > 0 ? args : [ "Assertion Failure" ];
                args.push(newLine);
                args.push(expr);
                this.log(Level.ERROR, args);
            }
        };
        this.toString = function() {
            return "Logger[" + this.name + "]";
        };
    }
    Logger.prototype = {
        trace: function() {
            this.log(Level.TRACE, arguments);
        },
        debug: function() {
            this.log(Level.DEBUG, arguments);
        },
        info: function() {
            this.log(Level.INFO, arguments);
        },
        warn: function() {
            this.log(Level.WARN, arguments);
        },
        error: function() {
            this.log(Level.ERROR, arguments);
        },
        fatal: function() {
            this.log(Level.FATAL, arguments);
        },
        isEnabledFor: function(level) {
            return level.isGreaterOrEqual(this.getEffectiveLevel());
        },
        isTraceEnabled: function() {
            return this.isEnabledFor(Level.TRACE);
        },
        isDebugEnabled: function() {
            return this.isEnabledFor(Level.DEBUG);
        },
        isInfoEnabled: function() {
            return this.isEnabledFor(Level.INFO);
        },
        isWarnEnabled: function() {
            return this.isEnabledFor(Level.WARN);
        },
        isErrorEnabled: function() {
            return this.isEnabledFor(Level.ERROR);
        },
        isFatalEnabled: function() {
            return this.isEnabledFor(Level.FATAL);
        }
    };
    Logger.prototype.trace.isEntryPoint = true;
    Logger.prototype.debug.isEntryPoint = true;
    Logger.prototype.info.isEntryPoint = true;
    Logger.prototype.warn.isEntryPoint = true;
    Logger.prototype.error.isEntryPoint = true;
    Logger.prototype.fatal.isEntryPoint = true;
    var loggers = {};
    var loggerNames = [];
    var ROOT_LOGGER_DEFAULT_LEVEL = Level.DEBUG;
    var rootLogger = new Logger(rootLoggerName);
    rootLogger.setLevel(ROOT_LOGGER_DEFAULT_LEVEL);
    log4javascript.getRootLogger = function() {
        return rootLogger;
    };
    log4javascript.getLogger = function(loggerName) {
        if (!(typeof loggerName == "string")) {
            loggerName = anonymousLoggerName;
            logLog.warn("log4javascript.getLogger: non-string logger name " + toStr(loggerName) + " supplied, returning anonymous logger");
        }
        if (loggerName == rootLoggerName) {
            handleError("log4javascript.getLogger: root logger may not be obtained by name");
        }
        if (!loggers[loggerName]) {
            var logger = new Logger(loggerName);
            loggers[loggerName] = logger;
            loggerNames.push(loggerName);
            var lastDotIndex = loggerName.lastIndexOf(".");
            var parentLogger;
            if (lastDotIndex > -1) {
                var parentLoggerName = loggerName.substring(0, lastDotIndex);
                parentLogger = log4javascript.getLogger(parentLoggerName);
            } else {
                parentLogger = rootLogger;
            }
            parentLogger.addChild(logger);
        }
        return loggers[loggerName];
    };
    var defaultLogger = null;
    log4javascript.getDefaultLogger = function() {
        if (!defaultLogger) {
            defaultLogger = log4javascript.getLogger(defaultLoggerName);
            var a = new log4javascript.PopUpAppender();
            defaultLogger.addAppender(a);
        }
        return defaultLogger;
    };
    var nullLogger = null;
    log4javascript.getNullLogger = function() {
        if (!nullLogger) {
            nullLogger = new Logger(nullLoggerName);
            nullLogger.setLevel(Level.OFF);
        }
        return nullLogger;
    };
    log4javascript.resetConfiguration = function() {
        rootLogger.setLevel(ROOT_LOGGER_DEFAULT_LEVEL);
        loggers = {};
    };
    var LoggingEvent = function(logger, timeStamp, level, messages, exception) {
        this.logger = logger;
        this.timeStamp = timeStamp;
        this.timeStampInMilliseconds = timeStamp.getTime();
        this.timeStampInSeconds = Math.floor(this.timeStampInMilliseconds / 1e3);
        this.milliseconds = this.timeStamp.getMilliseconds();
        this.level = level;
        this.messages = messages;
        this.exception = exception;
    };
    LoggingEvent.prototype = {
        getThrowableStrRep: function() {
            return this.exception ? getExceptionStringRep(this.exception) : "";
        },
        getCombinedMessages: function() {
            return this.messages.length == 1 ? this.messages[0] : this.messages.join(newLine);
        },
        toString: function() {
            return "LoggingEvent[" + this.level + "]";
        }
    };
    log4javascript.LoggingEvent = LoggingEvent;
    var Layout = function() {};
    Layout.prototype = {
        defaults: {
            loggerKey: "logger",
            timeStampKey: "timestamp",
            millisecondsKey: "milliseconds",
            levelKey: "level",
            messageKey: "message",
            exceptionKey: "exception",
            urlKey: "url"
        },
        loggerKey: "logger",
        timeStampKey: "timestamp",
        millisecondsKey: "milliseconds",
        levelKey: "level",
        messageKey: "message",
        exceptionKey: "exception",
        urlKey: "url",
        batchHeader: "",
        batchFooter: "",
        batchSeparator: "",
        returnsPostData: false,
        overrideTimeStampsSetting: false,
        useTimeStampsInMilliseconds: null,
        format: function() {
            handleError("Layout.format: layout supplied has no format() method");
        },
        ignoresThrowable: function() {
            handleError("Layout.ignoresThrowable: layout supplied has no ignoresThrowable() method");
        },
        getContentType: function() {
            return "text/plain";
        },
        allowBatching: function() {
            return true;
        },
        setTimeStampsInMilliseconds: function(timeStampsInMilliseconds) {
            this.overrideTimeStampsSetting = true;
            this.useTimeStampsInMilliseconds = bool(timeStampsInMilliseconds);
        },
        isTimeStampsInMilliseconds: function() {
            return this.overrideTimeStampsSetting ? this.useTimeStampsInMilliseconds : useTimeStampsInMilliseconds;
        },
        getTimeStampValue: function(loggingEvent) {
            return this.isTimeStampsInMilliseconds() ? loggingEvent.timeStampInMilliseconds : loggingEvent.timeStampInSeconds;
        },
        getDataValues: function(loggingEvent, combineMessages) {
            var dataValues = [ [ this.loggerKey, loggingEvent.logger.name ], [ this.timeStampKey, this.getTimeStampValue(loggingEvent) ], [ this.levelKey, loggingEvent.level.name ], [ this.urlKey, window.location.href ], [ this.messageKey, combineMessages ? loggingEvent.getCombinedMessages() : loggingEvent.messages ] ];
            if (!this.isTimeStampsInMilliseconds()) {
                dataValues.push([ this.millisecondsKey, loggingEvent.milliseconds ]);
            }
            if (loggingEvent.exception) {
                dataValues.push([ this.exceptionKey, getExceptionStringRep(loggingEvent.exception) ]);
            }
            if (this.hasCustomFields()) {
                for (var i = 0, len = this.customFields.length; i < len; i++) {
                    var val = this.customFields[i].value;
                    if (typeof val === "function") {
                        val = val(this, loggingEvent);
                    }
                    dataValues.push([ this.customFields[i].name, val ]);
                }
            }
            return dataValues;
        },
        setKeys: function(loggerKey, timeStampKey, levelKey, messageKey, exceptionKey, urlKey, millisecondsKey) {
            this.loggerKey = extractStringFromParam(loggerKey, this.defaults.loggerKey);
            this.timeStampKey = extractStringFromParam(timeStampKey, this.defaults.timeStampKey);
            this.levelKey = extractStringFromParam(levelKey, this.defaults.levelKey);
            this.messageKey = extractStringFromParam(messageKey, this.defaults.messageKey);
            this.exceptionKey = extractStringFromParam(exceptionKey, this.defaults.exceptionKey);
            this.urlKey = extractStringFromParam(urlKey, this.defaults.urlKey);
            this.millisecondsKey = extractStringFromParam(millisecondsKey, this.defaults.millisecondsKey);
        },
        setCustomField: function(name, value) {
            var fieldUpdated = false;
            for (var i = 0, len = this.customFields.length; i < len; i++) {
                if (this.customFields[i].name === name) {
                    this.customFields[i].value = value;
                    fieldUpdated = true;
                }
            }
            if (!fieldUpdated) {
                this.customFields.push({
                    name: name,
                    value: value
                });
            }
        },
        hasCustomFields: function() {
            return this.customFields.length > 0;
        },
        toString: function() {
            handleError("Layout.toString: all layouts must override this method");
        }
    };
    log4javascript.Layout = Layout;
    var Appender = function() {};
    Appender.prototype = new EventSupport();
    Appender.prototype.layout = new PatternLayout();
    Appender.prototype.threshold = Level.ALL;
    Appender.prototype.loggers = [];
    Appender.prototype.doAppend = function(loggingEvent) {
        if (enabled && loggingEvent.level.level >= this.threshold.level) {
            this.append(loggingEvent);
        }
    };
    Appender.prototype.append = function(loggingEvent) {};
    Appender.prototype.setLayout = function(layout) {
        if (layout instanceof Layout) {
            this.layout = layout;
        } else {
            handleError("Appender.setLayout: layout supplied to " + this.toString() + " is not a subclass of Layout");
        }
    };
    Appender.prototype.getLayout = function() {
        return this.layout;
    };
    Appender.prototype.setThreshold = function(threshold) {
        if (threshold instanceof Level) {
            this.threshold = threshold;
        } else {
            handleError("Appender.setThreshold: threshold supplied to " + this.toString() + " is not a subclass of Level");
        }
    };
    Appender.prototype.getThreshold = function() {
        return this.threshold;
    };
    Appender.prototype.setAddedToLogger = function(logger) {
        this.loggers.push(logger);
    };
    Appender.prototype.setRemovedFromLogger = function(logger) {
        array_remove(this.loggers, logger);
    };
    Appender.prototype.group = emptyFunction;
    Appender.prototype.groupEnd = emptyFunction;
    Appender.prototype.toString = function() {
        handleError("Appender.toString: all appenders must override this method");
    };
    log4javascript.Appender = Appender;
    function SimpleLayout() {
        this.customFields = [];
    }
    SimpleLayout.prototype = new Layout();
    SimpleLayout.prototype.format = function(loggingEvent) {
        return loggingEvent.level.name + " - " + loggingEvent.getCombinedMessages();
    };
    SimpleLayout.prototype.ignoresThrowable = function() {
        return true;
    };
    SimpleLayout.prototype.toString = function() {
        return "SimpleLayout";
    };
    log4javascript.SimpleLayout = SimpleLayout;
    function NullLayout() {
        this.customFields = [];
    }
    NullLayout.prototype = new Layout();
    NullLayout.prototype.format = function(loggingEvent) {
        return loggingEvent.messages;
    };
    NullLayout.prototype.ignoresThrowable = function() {
        return true;
    };
    NullLayout.prototype.toString = function() {
        return "NullLayout";
    };
    log4javascript.NullLayout = NullLayout;
    function XmlLayout(combineMessages) {
        this.combineMessages = extractBooleanFromParam(combineMessages, true);
        this.customFields = [];
    }
    XmlLayout.prototype = new Layout();
    XmlLayout.prototype.isCombinedMessages = function() {
        return this.combineMessages;
    };
    XmlLayout.prototype.getContentType = function() {
        return "text/xml";
    };
    XmlLayout.prototype.escapeCdata = function(str) {
        return str.replace(/\]\]>/, "]]>]]&gt;<![CDATA[");
    };
    XmlLayout.prototype.format = function(loggingEvent) {
        var layout = this;
        var i, len;
        function formatMessage(message) {
            message = typeof message === "string" ? message : toStr(message);
            return "<log4javascript:message><![CDATA[" + layout.escapeCdata(message) + "]]></log4javascript:message>";
        }
        var str = '<log4javascript:event logger="' + loggingEvent.logger.name + '" timestamp="' + this.getTimeStampValue(loggingEvent) + '"';
        if (!this.isTimeStampsInMilliseconds()) {
            str += ' milliseconds="' + loggingEvent.milliseconds + '"';
        }
        str += ' level="' + loggingEvent.level.name + '">' + newLine;
        if (this.combineMessages) {
            str += formatMessage(loggingEvent.getCombinedMessages());
        } else {
            str += "<log4javascript:messages>" + newLine;
            for (i = 0, len = loggingEvent.messages.length; i < len; i++) {
                str += formatMessage(loggingEvent.messages[i]) + newLine;
            }
            str += "</log4javascript:messages>" + newLine;
        }
        if (this.hasCustomFields()) {
            for (i = 0, len = this.customFields.length; i < len; i++) {
                str += '<log4javascript:customfield name="' + this.customFields[i].name + '"><![CDATA[' + this.customFields[i].value.toString() + "]]></log4javascript:customfield>" + newLine;
            }
        }
        if (loggingEvent.exception) {
            str += "<log4javascript:exception><![CDATA[" + getExceptionStringRep(loggingEvent.exception) + "]]></log4javascript:exception>" + newLine;
        }
        str += "</log4javascript:event>" + newLine + newLine;
        return str;
    };
    XmlLayout.prototype.ignoresThrowable = function() {
        return false;
    };
    XmlLayout.prototype.toString = function() {
        return "XmlLayout";
    };
    log4javascript.XmlLayout = XmlLayout;
    function escapeNewLines(str) {
        return str.replace(/\r\n|\r|\n/g, "\\r\\n");
    }
    function JsonLayout(readable, combineMessages) {
        this.readable = extractBooleanFromParam(readable, false);
        this.combineMessages = extractBooleanFromParam(combineMessages, true);
        this.batchHeader = this.readable ? "[" + newLine : "[";
        this.batchFooter = this.readable ? "]" + newLine : "]";
        this.batchSeparator = this.readable ? "," + newLine : ",";
        this.setKeys();
        this.colon = this.readable ? ": " : ":";
        this.tab = this.readable ? "	" : "";
        this.lineBreak = this.readable ? newLine : "";
        this.customFields = [];
    }
    JsonLayout.prototype = new Layout();
    JsonLayout.prototype.isReadable = function() {
        return this.readable;
    };
    JsonLayout.prototype.isCombinedMessages = function() {
        return this.combineMessages;
    };
    JsonLayout.prototype.format = function(loggingEvent) {
        var layout = this;
        var dataValues = this.getDataValues(loggingEvent, this.combineMessages);
        var str = "{" + this.lineBreak;
        var i, len;
        function formatValue(val, prefix, expand) {
            var formattedValue;
            var valType = typeof val;
            if (val instanceof Date) {
                formattedValue = String(val.getTime());
            } else if (expand && val instanceof Array) {
                formattedValue = "[" + layout.lineBreak;
                for (var i = 0, len = val.length; i < len; i++) {
                    var childPrefix = prefix + layout.tab;
                    formattedValue += childPrefix + formatValue(val[i], childPrefix, false);
                    if (i < val.length - 1) {
                        formattedValue += ",";
                    }
                    formattedValue += layout.lineBreak;
                }
                formattedValue += prefix + "]";
            } else if (valType !== "number" && valType !== "boolean") {
                formattedValue = '"' + escapeNewLines(toStr(val).replace(/\"/g, '\\"')) + '"';
            } else {
                formattedValue = val;
            }
            return formattedValue;
        }
        for (i = 0, len = dataValues.length - 1; i <= len; i++) {
            str += this.tab + '"' + dataValues[i][0] + '"' + this.colon + formatValue(dataValues[i][1], this.tab, true);
            if (i < len) {
                str += ",";
            }
            str += this.lineBreak;
        }
        str += "}" + this.lineBreak;
        return str;
    };
    JsonLayout.prototype.ignoresThrowable = function() {
        return false;
    };
    JsonLayout.prototype.toString = function() {
        return "JsonLayout";
    };
    JsonLayout.prototype.getContentType = function() {
        return "application/json";
    };
    log4javascript.JsonLayout = JsonLayout;
    function HttpPostDataLayout() {
        this.setKeys();
        this.customFields = [];
        this.returnsPostData = true;
    }
    HttpPostDataLayout.prototype = new Layout();
    HttpPostDataLayout.prototype.allowBatching = function() {
        return false;
    };
    HttpPostDataLayout.prototype.format = function(loggingEvent) {
        var dataValues = this.getDataValues(loggingEvent);
        var queryBits = [];
        for (var i = 0, len = dataValues.length; i < len; i++) {
            var val = dataValues[i][1] instanceof Date ? String(dataValues[i][1].getTime()) : dataValues[i][1];
            queryBits.push(urlEncode(dataValues[i][0]) + "=" + urlEncode(val));
        }
        return queryBits.join("&");
    };
    HttpPostDataLayout.prototype.ignoresThrowable = function(loggingEvent) {
        return false;
    };
    HttpPostDataLayout.prototype.toString = function() {
        return "HttpPostDataLayout";
    };
    log4javascript.HttpPostDataLayout = HttpPostDataLayout;
    function formatObjectExpansion(obj, depth, indentation) {
        var objectsExpanded = [];
        function doFormat(obj, depth, indentation) {
            var i, j, len, childDepth, childIndentation, childLines, expansion, childExpansion;
            if (!indentation) {
                indentation = "";
            }
            function formatString(text) {
                var lines = splitIntoLines(text);
                for (var j = 1, jLen = lines.length; j < jLen; j++) {
                    lines[j] = indentation + lines[j];
                }
                return lines.join(newLine);
            }
            if (obj === null) {
                return "null";
            } else if (typeof obj == "undefined") {
                return "undefined";
            } else if (typeof obj == "string") {
                return formatString(obj);
            } else if (typeof obj == "object" && array_contains(objectsExpanded, obj)) {
                try {
                    expansion = toStr(obj);
                } catch (ex) {
                    expansion = "Error formatting property. Details: " + getExceptionStringRep(ex);
                }
                return expansion + " [already expanded]";
            } else if (obj instanceof Array && depth > 0) {
                objectsExpanded.push(obj);
                expansion = "[" + newLine;
                childDepth = depth - 1;
                childIndentation = indentation + "  ";
                childLines = [];
                for (i = 0, len = obj.length; i < len; i++) {
                    try {
                        childExpansion = doFormat(obj[i], childDepth, childIndentation);
                        childLines.push(childIndentation + childExpansion);
                    } catch (ex) {
                        childLines.push(childIndentation + "Error formatting array member. Details: " + getExceptionStringRep(ex) + "");
                    }
                }
                expansion += childLines.join("," + newLine) + newLine + indentation + "]";
                return expansion;
            } else if (Object.prototype.toString.call(obj) == "[object Date]") {
                return obj.toString();
            } else if (typeof obj == "object" && depth > 0) {
                objectsExpanded.push(obj);
                expansion = "{" + newLine;
                childDepth = depth - 1;
                childIndentation = indentation + "  ";
                childLines = [];
                for (i in obj) {
                    try {
                        childExpansion = doFormat(obj[i], childDepth, childIndentation);
                        childLines.push(childIndentation + i + ": " + childExpansion);
                    } catch (ex) {
                        childLines.push(childIndentation + i + ": Error formatting property. Details: " + getExceptionStringRep(ex));
                    }
                }
                expansion += childLines.join("," + newLine) + newLine + indentation + "}";
                return expansion;
            } else {
                return formatString(toStr(obj));
            }
        }
        return doFormat(obj, depth, indentation);
    }
    var SimpleDateFormat;
    (function() {
        var regex = /('[^']*')|(G+|y+|M+|w+|W+|D+|d+|F+|E+|a+|H+|k+|K+|h+|m+|s+|S+|Z+)|([a-zA-Z]+)|([^a-zA-Z']+)/;
        var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
        var dayNames = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
        var TEXT2 = 0, TEXT3 = 1, NUMBER = 2, YEAR = 3, MONTH = 4, TIMEZONE = 5;
        var types = {
            G: TEXT2,
            y: YEAR,
            M: MONTH,
            w: NUMBER,
            W: NUMBER,
            D: NUMBER,
            d: NUMBER,
            F: NUMBER,
            E: TEXT3,
            a: TEXT2,
            H: NUMBER,
            k: NUMBER,
            K: NUMBER,
            h: NUMBER,
            m: NUMBER,
            s: NUMBER,
            S: NUMBER,
            Z: TIMEZONE
        };
        var ONE_DAY = 24 * 60 * 60 * 1e3;
        var ONE_WEEK = 7 * ONE_DAY;
        var DEFAULT_MINIMAL_DAYS_IN_FIRST_WEEK = 1;
        var newDateAtMidnight = function(year, month, day) {
            var d = new Date(year, month, day, 0, 0, 0);
            d.setMilliseconds(0);
            return d;
        };
        Date.prototype.getDifference = function(date) {
            return this.getTime() - date.getTime();
        };
        Date.prototype.isBefore = function(d) {
            return this.getTime() < d.getTime();
        };
        Date.prototype.getUTCTime = function() {
            return Date.UTC(this.getFullYear(), this.getMonth(), this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds());
        };
        Date.prototype.getTimeSince = function(d) {
            return this.getUTCTime() - d.getUTCTime();
        };
        Date.prototype.getPreviousSunday = function() {
            var midday = new Date(this.getFullYear(), this.getMonth(), this.getDate(), 12, 0, 0);
            var previousSunday = new Date(midday.getTime() - this.getDay() * ONE_DAY);
            return newDateAtMidnight(previousSunday.getFullYear(), previousSunday.getMonth(), previousSunday.getDate());
        };
        Date.prototype.getWeekInYear = function(minimalDaysInFirstWeek) {
            if (isUndefined(this.minimalDaysInFirstWeek)) {
                minimalDaysInFirstWeek = DEFAULT_MINIMAL_DAYS_IN_FIRST_WEEK;
            }
            var previousSunday = this.getPreviousSunday();
            var startOfYear = newDateAtMidnight(this.getFullYear(), 0, 1);
            var numberOfSundays = previousSunday.isBefore(startOfYear) ? 0 : 1 + Math.floor(previousSunday.getTimeSince(startOfYear) / ONE_WEEK);
            var numberOfDaysInFirstWeek = 7 - startOfYear.getDay();
            var weekInYear = numberOfSundays;
            if (numberOfDaysInFirstWeek < minimalDaysInFirstWeek) {
                weekInYear--;
            }
            return weekInYear;
        };
        Date.prototype.getWeekInMonth = function(minimalDaysInFirstWeek) {
            if (isUndefined(this.minimalDaysInFirstWeek)) {
                minimalDaysInFirstWeek = DEFAULT_MINIMAL_DAYS_IN_FIRST_WEEK;
            }
            var previousSunday = this.getPreviousSunday();
            var startOfMonth = newDateAtMidnight(this.getFullYear(), this.getMonth(), 1);
            var numberOfSundays = previousSunday.isBefore(startOfMonth) ? 0 : 1 + Math.floor(previousSunday.getTimeSince(startOfMonth) / ONE_WEEK);
            var numberOfDaysInFirstWeek = 7 - startOfMonth.getDay();
            var weekInMonth = numberOfSundays;
            if (numberOfDaysInFirstWeek >= minimalDaysInFirstWeek) {
                weekInMonth++;
            }
            return weekInMonth;
        };
        Date.prototype.getDayInYear = function() {
            var startOfYear = newDateAtMidnight(this.getFullYear(), 0, 1);
            return 1 + Math.floor(this.getTimeSince(startOfYear) / ONE_DAY);
        };
        SimpleDateFormat = function(formatString) {
            this.formatString = formatString;
        };
        SimpleDateFormat.prototype.setMinimalDaysInFirstWeek = function(days) {
            this.minimalDaysInFirstWeek = days;
        };
        SimpleDateFormat.prototype.getMinimalDaysInFirstWeek = function() {
            return isUndefined(this.minimalDaysInFirstWeek) ? DEFAULT_MINIMAL_DAYS_IN_FIRST_WEEK : this.minimalDaysInFirstWeek;
        };
        var padWithZeroes = function(str, len) {
            while (str.length < len) {
                str = "0" + str;
            }
            return str;
        };
        var formatText = function(data, numberOfLetters, minLength) {
            return numberOfLetters >= 4 ? data : data.substr(0, Math.max(minLength, numberOfLetters));
        };
        var formatNumber = function(data, numberOfLetters) {
            var dataString = "" + data;
            return padWithZeroes(dataString, numberOfLetters);
        };
        SimpleDateFormat.prototype.format = function(date) {
            var formattedString = "";
            var result;
            var searchString = this.formatString;
            while (result = regex.exec(searchString)) {
                var quotedString = result[1];
                var patternLetters = result[2];
                var otherLetters = result[3];
                var otherCharacters = result[4];
                if (quotedString) {
                    if (quotedString == "''") {
                        formattedString += "'";
                    } else {
                        formattedString += quotedString.substring(1, quotedString.length - 1);
                    }
                } else if (otherLetters) {} else if (otherCharacters) {
                    formattedString += otherCharacters;
                } else if (patternLetters) {
                    var patternLetter = patternLetters.charAt(0);
                    var numberOfLetters = patternLetters.length;
                    var rawData = "";
                    switch (patternLetter) {
                      case "G":
                        rawData = "AD";
                        break;

                      case "y":
                        rawData = date.getFullYear();
                        break;

                      case "M":
                        rawData = date.getMonth();
                        break;

                      case "w":
                        rawData = date.getWeekInYear(this.getMinimalDaysInFirstWeek());
                        break;

                      case "W":
                        rawData = date.getWeekInMonth(this.getMinimalDaysInFirstWeek());
                        break;

                      case "D":
                        rawData = date.getDayInYear();
                        break;

                      case "d":
                        rawData = date.getDate();
                        break;

                      case "F":
                        rawData = 1 + Math.floor((date.getDate() - 1) / 7);
                        break;

                      case "E":
                        rawData = dayNames[date.getDay()];
                        break;

                      case "a":
                        rawData = date.getHours() >= 12 ? "PM" : "AM";
                        break;

                      case "H":
                        rawData = date.getHours();
                        break;

                      case "k":
                        rawData = date.getHours() || 24;
                        break;

                      case "K":
                        rawData = date.getHours() % 12;
                        break;

                      case "h":
                        rawData = date.getHours() % 12 || 12;
                        break;

                      case "m":
                        rawData = date.getMinutes();
                        break;

                      case "s":
                        rawData = date.getSeconds();
                        break;

                      case "S":
                        rawData = date.getMilliseconds();
                        break;

                      case "Z":
                        rawData = date.getTimezoneOffset();
                        break;
                    }
                    switch (types[patternLetter]) {
                      case TEXT2:
                        formattedString += formatText(rawData, numberOfLetters, 2);
                        break;

                      case TEXT3:
                        formattedString += formatText(rawData, numberOfLetters, 3);
                        break;

                      case NUMBER:
                        formattedString += formatNumber(rawData, numberOfLetters);
                        break;

                      case YEAR:
                        if (numberOfLetters <= 3) {
                            var dataString = "" + rawData;
                            formattedString += dataString.substr(2, 2);
                        } else {
                            formattedString += formatNumber(rawData, numberOfLetters);
                        }
                        break;

                      case MONTH:
                        if (numberOfLetters >= 3) {
                            formattedString += formatText(monthNames[rawData], numberOfLetters, numberOfLetters);
                        } else {
                            formattedString += formatNumber(rawData + 1, numberOfLetters);
                        }
                        break;

                      case TIMEZONE:
                        var isPositive = rawData > 0;
                        var prefix = isPositive ? "-" : "+";
                        var absData = Math.abs(rawData);
                        var hours = "" + Math.floor(absData / 60);
                        hours = padWithZeroes(hours, 2);
                        var minutes = "" + absData % 60;
                        minutes = padWithZeroes(minutes, 2);
                        formattedString += prefix + hours + minutes;
                        break;
                    }
                }
                searchString = searchString.substr(result.index + result[0].length);
            }
            return formattedString;
        };
    })();
    log4javascript.SimpleDateFormat = SimpleDateFormat;
    function PatternLayout(pattern) {
        if (pattern) {
            this.pattern = pattern;
        } else {
            this.pattern = PatternLayout.DEFAULT_CONVERSION_PATTERN;
        }
        this.customFields = [];
    }
    PatternLayout.TTCC_CONVERSION_PATTERN = "%r %p %c - %m%n";
    PatternLayout.DEFAULT_CONVERSION_PATTERN = "%m%n";
    PatternLayout.ISO8601_DATEFORMAT = "yyyy-MM-dd HH:mm:ss,SSS";
    PatternLayout.DATETIME_DATEFORMAT = "dd MMM yyyy HH:mm:ss,SSS";
    PatternLayout.ABSOLUTETIME_DATEFORMAT = "HH:mm:ss,SSS";
    PatternLayout.prototype = new Layout();
    PatternLayout.prototype.format = function(loggingEvent) {
        var regex = /%(-?[0-9]+)?(\.?[0-9]+)?([acdfmMnpr%])(\{([^\}]+)\})?|([^%]+)/;
        var formattedString = "";
        var result;
        var searchString = this.pattern;
        while (result = regex.exec(searchString)) {
            var matchedString = result[0];
            var padding = result[1];
            var truncation = result[2];
            var conversionCharacter = result[3];
            var specifier = result[5];
            var text = result[6];
            if (text) {
                formattedString += "" + text;
            } else {
                var replacement = "";
                switch (conversionCharacter) {
                  case "a":
                  case "m":
                    var depth = 0;
                    if (specifier) {
                        depth = parseInt(specifier, 10);
                        if (isNaN(depth)) {
                            handleError("PatternLayout.format: invalid specifier '" + specifier + "' for conversion character '" + conversionCharacter + "' - should be a number");
                            depth = 0;
                        }
                    }
                    var messages = conversionCharacter === "a" ? loggingEvent.messages[0] : loggingEvent.messages;
                    for (var i = 0, len = messages.length; i < len; i++) {
                        if (i > 0 && replacement.charAt(replacement.length - 1) !== " ") {
                            replacement += " ";
                        }
                        if (depth === 0) {
                            replacement += messages[i];
                        } else {
                            replacement += formatObjectExpansion(messages[i], depth);
                        }
                    }
                    break;

                  case "c":
                    var loggerName = loggingEvent.logger.name;
                    if (specifier) {
                        var precision = parseInt(specifier, 10);
                        var loggerNameBits = loggingEvent.logger.name.split(".");
                        if (precision >= loggerNameBits.length) {
                            replacement = loggerName;
                        } else {
                            replacement = loggerNameBits.slice(loggerNameBits.length - precision).join(".");
                        }
                    } else {
                        replacement = loggerName;
                    }
                    break;

                  case "d":
                    var dateFormat = PatternLayout.ISO8601_DATEFORMAT;
                    if (specifier) {
                        dateFormat = specifier;
                        if (dateFormat == "ISO8601") {
                            dateFormat = PatternLayout.ISO8601_DATEFORMAT;
                        } else if (dateFormat == "ABSOLUTE") {
                            dateFormat = PatternLayout.ABSOLUTETIME_DATEFORMAT;
                        } else if (dateFormat == "DATE") {
                            dateFormat = PatternLayout.DATETIME_DATEFORMAT;
                        }
                    }
                    replacement = new SimpleDateFormat(dateFormat).format(loggingEvent.timeStamp);
                    break;

                  case "f":
                    if (this.hasCustomFields()) {
                        var fieldIndex = 0;
                        if (specifier) {
                            fieldIndex = parseInt(specifier, 10);
                            if (isNaN(fieldIndex)) {
                                handleError("PatternLayout.format: invalid specifier '" + specifier + "' for conversion character 'f' - should be a number");
                            } else if (fieldIndex === 0) {
                                handleError("PatternLayout.format: invalid specifier '" + specifier + "' for conversion character 'f' - must be greater than zero");
                            } else if (fieldIndex > this.customFields.length) {
                                handleError("PatternLayout.format: invalid specifier '" + specifier + "' for conversion character 'f' - there aren't that many custom fields");
                            } else {
                                fieldIndex = fieldIndex - 1;
                            }
                        }
                        var val = this.customFields[fieldIndex].value;
                        if (typeof val == "function") {
                            val = val(this, loggingEvent);
                        }
                        replacement = val;
                    }
                    break;

                  case "n":
                    replacement = newLine;
                    break;

                  case "p":
                    replacement = loggingEvent.level.name;
                    break;

                  case "r":
                    replacement = "" + loggingEvent.timeStamp.getDifference(applicationStartDate);
                    break;

                  case "%":
                    replacement = "%";
                    break;

                  default:
                    replacement = matchedString;
                    break;
                }
                var l;
                if (truncation) {
                    l = parseInt(truncation.substr(1), 10);
                    var strLen = replacement.length;
                    if (l < strLen) {
                        replacement = replacement.substring(strLen - l, strLen);
                    }
                }
                if (padding) {
                    if (padding.charAt(0) == "-") {
                        l = parseInt(padding.substr(1), 10);
                        while (replacement.length < l) {
                            replacement += " ";
                        }
                    } else {
                        l = parseInt(padding, 10);
                        while (replacement.length < l) {
                            replacement = " " + replacement;
                        }
                    }
                }
                formattedString += replacement;
            }
            searchString = searchString.substr(result.index + result[0].length);
        }
        return formattedString;
    };
    PatternLayout.prototype.ignoresThrowable = function() {
        return true;
    };
    PatternLayout.prototype.toString = function() {
        return "PatternLayout";
    };
    log4javascript.PatternLayout = PatternLayout;
    function AlertAppender() {}
    AlertAppender.prototype = new Appender();
    AlertAppender.prototype.layout = new SimpleLayout();
    AlertAppender.prototype.append = function(loggingEvent) {
        var formattedMessage = this.getLayout().format(loggingEvent);
        if (this.getLayout().ignoresThrowable()) {
            formattedMessage += loggingEvent.getThrowableStrRep();
        }
        alert(formattedMessage);
    };
    AlertAppender.prototype.toString = function() {
        return "AlertAppender";
    };
    log4javascript.AlertAppender = AlertAppender;
    function BrowserConsoleAppender() {}
    BrowserConsoleAppender.prototype = new log4javascript.Appender();
    BrowserConsoleAppender.prototype.layout = new NullLayout();
    BrowserConsoleAppender.prototype.threshold = Level.DEBUG;
    BrowserConsoleAppender.prototype.append = function(loggingEvent) {
        var appender = this;
        var getFormattedMessage = function() {
            var layout = appender.getLayout();
            var formattedMessage = layout.format(loggingEvent);
            if (layout.ignoresThrowable() && loggingEvent.exception) {
                formattedMessage += loggingEvent.getThrowableStrRep();
            }
            return formattedMessage;
        };
        if (typeof opera != "undefined" && opera.postError) {
            opera.postError(getFormattedMessage());
        } else if (window.console && window.console.log) {
            var formattedMesage = getFormattedMessage();
            if (window.console.debug && Level.DEBUG.isGreaterOrEqual(loggingEvent.level)) {
                window.console.debug(formattedMesage);
            } else if (window.console.info && Level.INFO.equals(loggingEvent.level)) {
                window.console.info(formattedMesage);
            } else if (window.console.warn && Level.WARN.equals(loggingEvent.level)) {
                window.console.warn(formattedMesage);
            } else if (window.console.error && loggingEvent.level.isGreaterOrEqual(Level.ERROR)) {
                window.console.error(formattedMesage);
            } else {
                window.console.log(formattedMesage);
            }
        }
    };
    BrowserConsoleAppender.prototype.group = function(name) {
        if (window.console && window.console.group) {
            window.console.group(name);
        }
    };
    BrowserConsoleAppender.prototype.groupEnd = function() {
        if (window.console && window.console.groupEnd) {
            window.console.groupEnd();
        }
    };
    BrowserConsoleAppender.prototype.toString = function() {
        return "BrowserConsoleAppender";
    };
    log4javascript.BrowserConsoleAppender = BrowserConsoleAppender;
    var xmlHttpFactories = [ function() {
        return new XMLHttpRequest();
    }, function() {
        return new ActiveXObject("Msxml2.XMLHTTP");
    }, function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
    } ];
    var getXmlHttp = function(errorHandler) {
        var xmlHttp = null, factory;
        for (var i = 0, len = xmlHttpFactories.length; i < len; i++) {
            factory = xmlHttpFactories[i];
            try {
                xmlHttp = factory();
                getXmlHttp = factory;
                return xmlHttp;
            } catch (e) {}
        }
        if (errorHandler) {
            errorHandler();
        } else {
            handleError("getXmlHttp: unable to obtain XMLHttpRequest object");
        }
    };
    function isHttpRequestSuccessful(xmlHttp) {
        return isUndefined(xmlHttp.status) || xmlHttp.status === 0 || xmlHttp.status >= 200 && xmlHttp.status < 300 || xmlHttp.status == 1223;
    }
    function AjaxAppender(url) {
        var appender = this;
        var isSupported = true;
        if (!url) {
            handleError("AjaxAppender: URL must be specified in constructor");
            isSupported = false;
        }
        var timed = this.defaults.timed;
        var waitForResponse = this.defaults.waitForResponse;
        var batchSize = this.defaults.batchSize;
        var timerInterval = this.defaults.timerInterval;
        var requestSuccessCallback = this.defaults.requestSuccessCallback;
        var failCallback = this.defaults.failCallback;
        var postVarName = this.defaults.postVarName;
        var sendAllOnUnload = this.defaults.sendAllOnUnload;
        var contentType = this.defaults.contentType;
        var sessionId = null;
        var queuedLoggingEvents = [];
        var queuedRequests = [];
        var headers = [];
        var sending = false;
        var initialized = false;
        function checkCanConfigure(configOptionName) {
            if (initialized) {
                handleError("AjaxAppender: configuration option '" + configOptionName + "' may not be set after the appender has been initialized");
                return false;
            }
            return true;
        }
        this.getSessionId = function() {
            return sessionId;
        };
        this.setSessionId = function(sessionIdParam) {
            sessionId = extractStringFromParam(sessionIdParam, null);
            this.layout.setCustomField("sessionid", sessionId);
        };
        this.setLayout = function(layoutParam) {
            if (checkCanConfigure("layout")) {
                this.layout = layoutParam;
                if (sessionId !== null) {
                    this.setSessionId(sessionId);
                }
            }
        };
        this.isTimed = function() {
            return timed;
        };
        this.setTimed = function(timedParam) {
            if (checkCanConfigure("timed")) {
                timed = bool(timedParam);
            }
        };
        this.getTimerInterval = function() {
            return timerInterval;
        };
        this.setTimerInterval = function(timerIntervalParam) {
            if (checkCanConfigure("timerInterval")) {
                timerInterval = extractIntFromParam(timerIntervalParam, timerInterval);
            }
        };
        this.isWaitForResponse = function() {
            return waitForResponse;
        };
        this.setWaitForResponse = function(waitForResponseParam) {
            if (checkCanConfigure("waitForResponse")) {
                waitForResponse = bool(waitForResponseParam);
            }
        };
        this.getBatchSize = function() {
            return batchSize;
        };
        this.setBatchSize = function(batchSizeParam) {
            if (checkCanConfigure("batchSize")) {
                batchSize = extractIntFromParam(batchSizeParam, batchSize);
            }
        };
        this.isSendAllOnUnload = function() {
            return sendAllOnUnload;
        };
        this.setSendAllOnUnload = function(sendAllOnUnloadParam) {
            if (checkCanConfigure("sendAllOnUnload")) {
                sendAllOnUnload = extractBooleanFromParam(sendAllOnUnloadParam, sendAllOnUnload);
            }
        };
        this.setRequestSuccessCallback = function(requestSuccessCallbackParam) {
            requestSuccessCallback = extractFunctionFromParam(requestSuccessCallbackParam, requestSuccessCallback);
        };
        this.setFailCallback = function(failCallbackParam) {
            failCallback = extractFunctionFromParam(failCallbackParam, failCallback);
        };
        this.getPostVarName = function() {
            return postVarName;
        };
        this.setPostVarName = function(postVarNameParam) {
            if (checkCanConfigure("postVarName")) {
                postVarName = extractStringFromParam(postVarNameParam, postVarName);
            }
        };
        this.getHeaders = function() {
            return headers;
        };
        this.addHeader = function(name, value) {
            if (name.toLowerCase() == "content-type") {
                contentType = value;
            } else {
                headers.push({
                    name: name,
                    value: value
                });
            }
        };
        function sendAll() {
            if (isSupported && enabled) {
                sending = true;
                var currentRequestBatch;
                if (waitForResponse) {
                    if (queuedRequests.length > 0) {
                        currentRequestBatch = queuedRequests.shift();
                        sendRequest(preparePostData(currentRequestBatch), sendAll);
                    } else {
                        sending = false;
                        if (timed) {
                            scheduleSending();
                        }
                    }
                } else {
                    while (currentRequestBatch = queuedRequests.shift()) {
                        sendRequest(preparePostData(currentRequestBatch));
                    }
                    sending = false;
                    if (timed) {
                        scheduleSending();
                    }
                }
            }
        }
        this.sendAll = sendAll;
        function sendAllRemaining() {
            var sendingAnything = false;
            if (isSupported && enabled) {
                var actualBatchSize = appender.getLayout().allowBatching() ? batchSize : 1;
                var currentLoggingEvent;
                var batchedLoggingEvents = [];
                while (currentLoggingEvent = queuedLoggingEvents.shift()) {
                    batchedLoggingEvents.push(currentLoggingEvent);
                    if (queuedLoggingEvents.length >= actualBatchSize) {
                        queuedRequests.push(batchedLoggingEvents);
                        batchedLoggingEvents = [];
                    }
                }
                if (batchedLoggingEvents.length > 0) {
                    queuedRequests.push(batchedLoggingEvents);
                }
                sendingAnything = queuedRequests.length > 0;
                waitForResponse = false;
                timed = false;
                sendAll();
            }
            return sendingAnything;
        }
        this.sendAllRemaining = sendAllRemaining;
        function preparePostData(batchedLoggingEvents) {
            var formattedMessages = [];
            var currentLoggingEvent;
            var postData = "";
            while (currentLoggingEvent = batchedLoggingEvents.shift()) {
                var currentFormattedMessage = appender.getLayout().format(currentLoggingEvent);
                if (appender.getLayout().ignoresThrowable()) {
                    currentFormattedMessage += currentLoggingEvent.getThrowableStrRep();
                }
                formattedMessages.push(currentFormattedMessage);
            }
            if (batchedLoggingEvents.length == 1) {
                postData = formattedMessages.join("");
            } else {
                postData = appender.getLayout().batchHeader + formattedMessages.join(appender.getLayout().batchSeparator) + appender.getLayout().batchFooter;
            }
            if (contentType == appender.defaults.contentType) {
                postData = appender.getLayout().returnsPostData ? postData : urlEncode(postVarName) + "=" + urlEncode(postData);
                if (postData.length > 0) {
                    postData += "&";
                }
                postData += "layout=" + urlEncode(appender.getLayout().toString());
            }
            return postData;
        }
        function scheduleSending() {
            window.setTimeout(sendAll, timerInterval);
        }
        function xmlHttpErrorHandler() {
            var msg = "AjaxAppender: could not create XMLHttpRequest object. AjaxAppender disabled";
            handleError(msg);
            isSupported = false;
            if (failCallback) {
                failCallback(msg);
            }
        }
        function sendRequest(postData, successCallback) {
            try {
                var xmlHttp = getXmlHttp(xmlHttpErrorHandler);
                if (isSupported) {
                    if (xmlHttp.overrideMimeType) {
                        xmlHttp.overrideMimeType(appender.getLayout().getContentType());
                    }
                    xmlHttp.onreadystatechange = function() {
                        if (xmlHttp.readyState == 4) {
                            if (isHttpRequestSuccessful(xmlHttp)) {
                                if (requestSuccessCallback) {
                                    requestSuccessCallback(xmlHttp);
                                }
                                if (successCallback) {
                                    successCallback(xmlHttp);
                                }
                            } else {
                                var msg = "AjaxAppender.append: XMLHttpRequest request to URL " + url + " returned status code " + xmlHttp.status;
                                handleError(msg);
                                if (failCallback) {
                                    failCallback(msg);
                                }
                            }
                            xmlHttp.onreadystatechange = emptyFunction;
                            xmlHttp = null;
                        }
                    };
                    xmlHttp.open("POST", url, true);
                    try {
                        for (var i = 0, header; header = headers[i++]; ) {
                            xmlHttp.setRequestHeader(header.name, header.value);
                        }
                        xmlHttp.setRequestHeader("Content-Type", contentType);
                    } catch (headerEx) {
                        var msg = "AjaxAppender.append: your browser's XMLHttpRequest implementation" + " does not support setRequestHeader, therefore cannot post data. AjaxAppender disabled";
                        handleError(msg);
                        isSupported = false;
                        if (failCallback) {
                            failCallback(msg);
                        }
                        return;
                    }
                    xmlHttp.send(postData);
                }
            } catch (ex) {
                var errMsg = "AjaxAppender.append: error sending log message to " + url;
                handleError(errMsg, ex);
                isSupported = false;
                if (failCallback) {
                    failCallback(errMsg + ". Details: " + getExceptionStringRep(ex));
                }
            }
        }
        this.append = function(loggingEvent) {
            if (isSupported) {
                if (!initialized) {
                    init();
                }
                queuedLoggingEvents.push(loggingEvent);
                var actualBatchSize = this.getLayout().allowBatching() ? batchSize : 1;
                if (queuedLoggingEvents.length >= actualBatchSize) {
                    var currentLoggingEvent;
                    var batchedLoggingEvents = [];
                    while (currentLoggingEvent = queuedLoggingEvents.shift()) {
                        batchedLoggingEvents.push(currentLoggingEvent);
                    }
                    queuedRequests.push(batchedLoggingEvents);
                    if (!timed && (!waitForResponse || waitForResponse && !sending)) {
                        sendAll();
                    }
                }
            }
        };
        function init() {
            initialized = true;
            if (sendAllOnUnload) {
                var oldBeforeUnload = window.onbeforeunload;
                window.onbeforeunload = function() {
                    if (oldBeforeUnload) {
                        oldBeforeUnload();
                    }
                    if (sendAllRemaining()) {
                        return "Sending log messages";
                    }
                };
            }
            if (timed) {
                scheduleSending();
            }
        }
    }
    AjaxAppender.prototype = new Appender();
    AjaxAppender.prototype.defaults = {
        waitForResponse: false,
        timed: false,
        timerInterval: 1e3,
        batchSize: 1,
        sendAllOnUnload: false,
        requestSuccessCallback: null,
        failCallback: null,
        postVarName: "data",
        contentType: "application/x-www-form-urlencoded"
    };
    AjaxAppender.prototype.layout = new HttpPostDataLayout();
    AjaxAppender.prototype.toString = function() {
        return "AjaxAppender";
    };
    log4javascript.AjaxAppender = AjaxAppender;
    function setCookie(name, value, days, path) {
        var expires;
        path = path ? "; path=" + path : "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1e3);
            expires = "; expires=" + date.toGMTString();
        } else {
            expires = "";
        }
        document.cookie = escape(name) + "=" + escape(value) + expires + path;
    }
    function getCookie(name) {
        var nameEquals = escape(name) + "=";
        var ca = document.cookie.split(";");
        for (var i = 0, len = ca.length; i < len; i++) {
            var c = ca[i];
            while (c.charAt(0) === " ") {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEquals) === 0) {
                return unescape(c.substring(nameEquals.length, c.length));
            }
        }
        return null;
    }
    function getBaseUrl() {
        var scripts = document.getElementsByTagName("script");
        for (var i = 0, len = scripts.length; i < len; ++i) {
            if (scripts[i].src.indexOf("log4javascript") != -1) {
                var lastSlash = scripts[i].src.lastIndexOf("/");
                return lastSlash == -1 ? "" : scripts[i].src.substr(0, lastSlash + 1);
            }
        }
        return null;
    }
    function isLoaded(win) {
        try {
            return bool(win.loaded);
        } catch (ex) {
            return false;
        }
    }
    var ConsoleAppender;
    (function() {
        var getConsoleHtmlLines = function() {
            return [ '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">', '<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">', "<head>", "<title>log4javascript</title>", '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />', "<!-- Make IE8 behave like IE7, having gone to all the trouble of making IE work -->", '<meta http-equiv="X-UA-Compatible" content="IE=7" />', '<script type="text/javascript">var isIe = false, isIePre7 = false;</script>', '<!--[if IE]><script type="text/javascript">isIe = true</script><![endif]-->', '<!--[if lt IE 7]><script type="text/javascript">isIePre7 = true</script><![endif]-->', '<script type="text/javascript">', "//<![CDATA[", "var loggingEnabled=true;var logQueuedEventsTimer=null;var logEntries=[];var logEntriesAndSeparators=[];var logItems=[];var renderDelay=100;var unrenderedLogItemsExist=false;var rootGroup,currentGroup=null;var loaded=false;var currentLogItem=null;var logMainContainer;function copyProperties(obj,props){for(var i in props){obj[i]=props[i];}}", "function LogItem(){}", "LogItem.prototype={mainContainer:null,wrappedContainer:null,unwrappedContainer:null,group:null,appendToLog:function(){for(var i=0,len=this.elementContainers.length;i<len;i++){this.elementContainers[i].appendToLog();}", "this.group.update();},doRemove:function(doUpdate,removeFromGroup){if(this.rendered){for(var i=0,len=this.elementContainers.length;i<len;i++){this.elementContainers[i].remove();}", "this.unwrappedElementContainer=null;this.wrappedElementContainer=null;this.mainElementContainer=null;}", "if(this.group&&removeFromGroup){this.group.removeChild(this,doUpdate);}", "if(this===currentLogItem){currentLogItem=null;}},remove:function(doUpdate,removeFromGroup){this.doRemove(doUpdate,removeFromGroup);},render:function(){},accept:function(visitor){visitor.visit(this);},getUnwrappedDomContainer:function(){return this.group.unwrappedElementContainer.contentDiv;},getWrappedDomContainer:function(){return this.group.wrappedElementContainer.contentDiv;},getMainDomContainer:function(){return this.group.mainElementContainer.contentDiv;}};LogItem.serializedItemKeys={LOG_ENTRY:0,GROUP_START:1,GROUP_END:2};function LogItemContainerElement(){}", 'LogItemContainerElement.prototype={appendToLog:function(){var insertBeforeFirst=(newestAtTop&&this.containerDomNode.hasChildNodes());if(insertBeforeFirst){this.containerDomNode.insertBefore(this.mainDiv,this.containerDomNode.firstChild);}else{this.containerDomNode.appendChild(this.mainDiv);}}};function SeparatorElementContainer(containerDomNode){this.containerDomNode=containerDomNode;this.mainDiv=document.createElement("div");this.mainDiv.className="separator";this.mainDiv.innerHTML="&nbsp;";}', "SeparatorElementContainer.prototype=new LogItemContainerElement();SeparatorElementContainer.prototype.remove=function(){this.mainDiv.parentNode.removeChild(this.mainDiv);this.mainDiv=null;};function Separator(){this.rendered=false;}", "Separator.prototype=new LogItem();copyProperties(Separator.prototype,{render:function(){var containerDomNode=this.group.contentDiv;if(isIe){this.unwrappedElementContainer=new SeparatorElementContainer(this.getUnwrappedDomContainer());this.wrappedElementContainer=new SeparatorElementContainer(this.getWrappedDomContainer());this.elementContainers=[this.unwrappedElementContainer,this.wrappedElementContainer];}else{this.mainElementContainer=new SeparatorElementContainer(this.getMainDomContainer());this.elementContainers=[this.mainElementContainer];}", 'this.content=this.formattedMessage;this.rendered=true;}});function GroupElementContainer(group,containerDomNode,isRoot,isWrapped){this.group=group;this.containerDomNode=containerDomNode;this.isRoot=isRoot;this.isWrapped=isWrapped;this.expandable=false;if(this.isRoot){if(isIe){this.contentDiv=logMainContainer.appendChild(document.createElement("div"));this.contentDiv.id=this.isWrapped?"log_wrapped":"log_unwrapped";}else{this.contentDiv=logMainContainer;}}else{var groupElementContainer=this;this.mainDiv=document.createElement("div");this.mainDiv.className="group";this.headingDiv=this.mainDiv.appendChild(document.createElement("div"));this.headingDiv.className="groupheading";this.expander=this.headingDiv.appendChild(document.createElement("span"));this.expander.className="expander unselectable greyedout";this.expander.unselectable=true;var expanderText=this.group.expanded?"-":"+";this.expanderTextNode=this.expander.appendChild(document.createTextNode(expanderText));this.headingDiv.appendChild(document.createTextNode(" "+this.group.name));this.contentDiv=this.mainDiv.appendChild(document.createElement("div"));var contentCssClass=this.group.expanded?"expanded":"collapsed";this.contentDiv.className="groupcontent "+contentCssClass;this.expander.onclick=function(){if(groupElementContainer.group.expandable){groupElementContainer.group.toggleExpanded();}};}}', 'GroupElementContainer.prototype=new LogItemContainerElement();copyProperties(GroupElementContainer.prototype,{toggleExpanded:function(){if(!this.isRoot){var oldCssClass,newCssClass,expanderText;if(this.group.expanded){newCssClass="expanded";oldCssClass="collapsed";expanderText="-";}else{newCssClass="collapsed";oldCssClass="expanded";expanderText="+";}', "replaceClass(this.contentDiv,newCssClass,oldCssClass);this.expanderTextNode.nodeValue=expanderText;}},remove:function(){if(!this.isRoot){this.headingDiv=null;this.expander.onclick=null;this.expander=null;this.expanderTextNode=null;this.contentDiv=null;this.containerDomNode=null;this.mainDiv.parentNode.removeChild(this.mainDiv);this.mainDiv=null;}},reverseChildren:function(){var node=null;var childDomNodes=[];while((node=this.contentDiv.firstChild)){this.contentDiv.removeChild(node);childDomNodes.push(node);}", 'while((node=childDomNodes.pop())){this.contentDiv.appendChild(node);}},update:function(){if(!this.isRoot){if(this.group.expandable){removeClass(this.expander,"greyedout");}else{addClass(this.expander,"greyedout");}}},clear:function(){if(this.isRoot){this.contentDiv.innerHTML="";}}});function Group(name,isRoot,initiallyExpanded){this.name=name;this.group=null;this.isRoot=isRoot;this.initiallyExpanded=initiallyExpanded;this.elementContainers=[];this.children=[];this.expanded=initiallyExpanded;this.rendered=false;this.expandable=false;}', "Group.prototype=new LogItem();copyProperties(Group.prototype,{addChild:function(logItem){this.children.push(logItem);logItem.group=this;},render:function(){if(isIe){var unwrappedDomContainer,wrappedDomContainer;if(this.isRoot){unwrappedDomContainer=logMainContainer;wrappedDomContainer=logMainContainer;}else{unwrappedDomContainer=this.getUnwrappedDomContainer();wrappedDomContainer=this.getWrappedDomContainer();}", "this.unwrappedElementContainer=new GroupElementContainer(this,unwrappedDomContainer,this.isRoot,false);this.wrappedElementContainer=new GroupElementContainer(this,wrappedDomContainer,this.isRoot,true);this.elementContainers=[this.unwrappedElementContainer,this.wrappedElementContainer];}else{var mainDomContainer=this.isRoot?logMainContainer:this.getMainDomContainer();this.mainElementContainer=new GroupElementContainer(this,mainDomContainer,this.isRoot,false);this.elementContainers=[this.mainElementContainer];}", "this.rendered=true;},toggleExpanded:function(){this.expanded=!this.expanded;for(var i=0,len=this.elementContainers.length;i<len;i++){this.elementContainers[i].toggleExpanded();}},expand:function(){if(!this.expanded){this.toggleExpanded();}},accept:function(visitor){visitor.visitGroup(this);},reverseChildren:function(){if(this.rendered){for(var i=0,len=this.elementContainers.length;i<len;i++){this.elementContainers[i].reverseChildren();}}},update:function(){var previouslyExpandable=this.expandable;this.expandable=(this.children.length!==0);if(this.expandable!==previouslyExpandable){for(var i=0,len=this.elementContainers.length;i<len;i++){this.elementContainers[i].update();}}},flatten:function(){var visitor=new GroupFlattener();this.accept(visitor);return visitor.logEntriesAndSeparators;},removeChild:function(child,doUpdate){array_remove(this.children,child);child.group=null;if(doUpdate){this.update();}},remove:function(doUpdate,removeFromGroup){for(var i=0,len=this.children.length;i<len;i++){this.children[i].remove(false,false);}", "this.children=[];this.update();if(this===currentGroup){currentGroup=this.group;}", "this.doRemove(doUpdate,removeFromGroup);},serialize:function(items){items.push([LogItem.serializedItemKeys.GROUP_START,this.name]);for(var i=0,len=this.children.length;i<len;i++){this.children[i].serialize(items);}", "if(this!==currentGroup){items.push([LogItem.serializedItemKeys.GROUP_END]);}},clear:function(){for(var i=0,len=this.elementContainers.length;i<len;i++){this.elementContainers[i].clear();}}});function LogEntryElementContainer(){}", 'LogEntryElementContainer.prototype=new LogItemContainerElement();copyProperties(LogEntryElementContainer.prototype,{remove:function(){this.doRemove();},doRemove:function(){this.mainDiv.parentNode.removeChild(this.mainDiv);this.mainDiv=null;this.contentElement=null;this.containerDomNode=null;},setContent:function(content,wrappedContent){if(content===this.formattedMessage){this.contentElement.innerHTML="";this.contentElement.appendChild(document.createTextNode(this.formattedMessage));}else{this.contentElement.innerHTML=content;}},setSearchMatch:function(isMatch){var oldCssClass=isMatch?"searchnonmatch":"searchmatch";var newCssClass=isMatch?"searchmatch":"searchnonmatch";replaceClass(this.mainDiv,newCssClass,oldCssClass);},clearSearch:function(){removeClass(this.mainDiv,"searchmatch");removeClass(this.mainDiv,"searchnonmatch");}});function LogEntryWrappedElementContainer(logEntry,containerDomNode){this.logEntry=logEntry;this.containerDomNode=containerDomNode;this.mainDiv=document.createElement("div");this.mainDiv.appendChild(document.createTextNode(this.logEntry.formattedMessage));this.mainDiv.className="logentry wrapped "+this.logEntry.level;this.contentElement=this.mainDiv;}', 'LogEntryWrappedElementContainer.prototype=new LogEntryElementContainer();LogEntryWrappedElementContainer.prototype.setContent=function(content,wrappedContent){if(content===this.formattedMessage){this.contentElement.innerHTML="";this.contentElement.appendChild(document.createTextNode(this.formattedMessage));}else{this.contentElement.innerHTML=wrappedContent;}};function LogEntryUnwrappedElementContainer(logEntry,containerDomNode){this.logEntry=logEntry;this.containerDomNode=containerDomNode;this.mainDiv=document.createElement("div");this.mainDiv.className="logentry unwrapped "+this.logEntry.level;this.pre=this.mainDiv.appendChild(document.createElement("pre"));this.pre.appendChild(document.createTextNode(this.logEntry.formattedMessage));this.pre.className="unwrapped";this.contentElement=this.pre;}', 'LogEntryUnwrappedElementContainer.prototype=new LogEntryElementContainer();LogEntryUnwrappedElementContainer.prototype.remove=function(){this.doRemove();this.pre=null;};function LogEntryMainElementContainer(logEntry,containerDomNode){this.logEntry=logEntry;this.containerDomNode=containerDomNode;this.mainDiv=document.createElement("div");this.mainDiv.className="logentry nonielogentry "+this.logEntry.level;this.contentElement=this.mainDiv.appendChild(document.createElement("span"));this.contentElement.appendChild(document.createTextNode(this.logEntry.formattedMessage));}', "LogEntryMainElementContainer.prototype=new LogEntryElementContainer();function LogEntry(level,formattedMessage){this.level=level;this.formattedMessage=formattedMessage;this.rendered=false;}", 'LogEntry.prototype=new LogItem();copyProperties(LogEntry.prototype,{render:function(){var logEntry=this;var containerDomNode=this.group.contentDiv;if(isIe){this.formattedMessage=this.formattedMessage.replace(/\\r\\n/g,"\\r");this.unwrappedElementContainer=new LogEntryUnwrappedElementContainer(this,this.getUnwrappedDomContainer());this.wrappedElementContainer=new LogEntryWrappedElementContainer(this,this.getWrappedDomContainer());this.elementContainers=[this.unwrappedElementContainer,this.wrappedElementContainer];}else{this.mainElementContainer=new LogEntryMainElementContainer(this,this.getMainDomContainer());this.elementContainers=[this.mainElementContainer];}', 'this.content=this.formattedMessage;this.rendered=true;},setContent:function(content,wrappedContent){if(content!=this.content){if(isIe&&(content!==this.formattedMessage)){content=content.replace(/\\r\\n/g,"\\r");}', "for(var i=0,len=this.elementContainers.length;i<len;i++){this.elementContainers[i].setContent(content,wrappedContent);}", 'this.content=content;}},getSearchMatches:function(){var matches=[];var i,len;if(isIe){var unwrappedEls=getElementsByClass(this.unwrappedElementContainer.mainDiv,"searchterm","span");var wrappedEls=getElementsByClass(this.wrappedElementContainer.mainDiv,"searchterm","span");for(i=0,len=unwrappedEls.length;i<len;i++){matches[i]=new Match(this.level,null,unwrappedEls[i],wrappedEls[i]);}}else{var els=getElementsByClass(this.mainElementContainer.mainDiv,"searchterm","span");for(i=0,len=els.length;i<len;i++){matches[i]=new Match(this.level,els[i]);}}', "return matches;},setSearchMatch:function(isMatch){for(var i=0,len=this.elementContainers.length;i<len;i++){this.elementContainers[i].setSearchMatch(isMatch);}},clearSearch:function(){for(var i=0,len=this.elementContainers.length;i<len;i++){this.elementContainers[i].clearSearch();}},accept:function(visitor){visitor.visitLogEntry(this);},serialize:function(items){items.push([LogItem.serializedItemKeys.LOG_ENTRY,this.level,this.formattedMessage]);}});function LogItemVisitor(){}", "LogItemVisitor.prototype={visit:function(logItem){},visitParent:function(logItem){if(logItem.group){logItem.group.accept(this);}},visitChildren:function(logItem){for(var i=0,len=logItem.children.length;i<len;i++){logItem.children[i].accept(this);}},visitLogEntry:function(logEntry){this.visit(logEntry);},visitSeparator:function(separator){this.visit(separator);},visitGroup:function(group){this.visit(group);}};function GroupFlattener(){this.logEntriesAndSeparators=[];}", 'GroupFlattener.prototype=new LogItemVisitor();GroupFlattener.prototype.visitGroup=function(group){this.visitChildren(group);};GroupFlattener.prototype.visitLogEntry=function(logEntry){this.logEntriesAndSeparators.push(logEntry);};GroupFlattener.prototype.visitSeparator=function(separator){this.logEntriesAndSeparators.push(separator);};window.onload=function(){if(location.search){var queryBits=unescape(location.search).substr(1).split("&"),nameValueBits;for(var i=0,len=queryBits.length;i<len;i++){nameValueBits=queryBits[i].split("=");if(nameValueBits[0]=="log4javascript_domain"){document.domain=nameValueBits[1];break;}}}', 'logMainContainer=$("log");if(isIePre7){addClass(logMainContainer,"oldIe");}', 'rootGroup=new Group("root",true);rootGroup.render();currentGroup=rootGroup;setCommandInputWidth();setLogContainerHeight();toggleLoggingEnabled();toggleSearchEnabled();toggleSearchFilter();toggleSearchHighlight();applyFilters();checkAllLevels();toggleWrap();toggleNewestAtTop();toggleScrollToLatest();renderQueuedLogItems();loaded=true;$("command").value="";$("command").autocomplete="off";$("command").onkeydown=function(evt){evt=getEvent(evt);if(evt.keyCode==10||evt.keyCode==13){evalCommandLine();stopPropagation(evt);}else if(evt.keyCode==27){this.value="";this.focus();}else if(evt.keyCode==38&&commandHistory.length>0){currentCommandIndex=Math.max(0,currentCommandIndex-1);this.value=commandHistory[currentCommandIndex];moveCaretToEnd(this);}else if(evt.keyCode==40&&commandHistory.length>0){currentCommandIndex=Math.min(commandHistory.length-1,currentCommandIndex+1);this.value=commandHistory[currentCommandIndex];moveCaretToEnd(this);}};$("command").onkeypress=function(evt){evt=getEvent(evt);if(evt.keyCode==38&&commandHistory.length>0&&evt.preventDefault){evt.preventDefault();}};$("command").onkeyup=function(evt){evt=getEvent(evt);if(evt.keyCode==27&&evt.preventDefault){evt.preventDefault();this.focus();}};document.onkeydown=function keyEventHandler(evt){evt=getEvent(evt);switch(evt.keyCode){case 69:if(evt.shiftKey&&(evt.ctrlKey||evt.metaKey)){evalLastCommand();cancelKeyEvent(evt);return false;}', "break;case 75:if(evt.shiftKey&&(evt.ctrlKey||evt.metaKey)){focusSearch();cancelKeyEvent(evt);return false;}", "break;case 40:case 76:if(evt.shiftKey&&(evt.ctrlKey||evt.metaKey)){focusCommandLine();cancelKeyEvent(evt);return false;}", "break;}};setTimeout(setLogContainerHeight,20);setShowCommandLine(showCommandLine);doSearch();};window.onunload=function(){if(mainWindowExists()){appender.unload();}", 'appender=null;};function toggleLoggingEnabled(){setLoggingEnabled($("enableLogging").checked);}', "function setLoggingEnabled(enable){loggingEnabled=enable;}", "var appender=null;function setAppender(appenderParam){appender=appenderParam;}", 'function setShowCloseButton(showCloseButton){$("closeButton").style.display=showCloseButton?"inline":"none";}', 'function setShowHideButton(showHideButton){$("hideButton").style.display=showHideButton?"inline":"none";}', "var newestAtTop=false;function LogItemContentReverser(){}", "LogItemContentReverser.prototype=new LogItemVisitor();LogItemContentReverser.prototype.visitGroup=function(group){group.reverseChildren();this.visitChildren(group);};function setNewestAtTop(isNewestAtTop){var oldNewestAtTop=newestAtTop;var i,iLen,j,jLen;newestAtTop=Boolean(isNewestAtTop);if(oldNewestAtTop!=newestAtTop){var visitor=new LogItemContentReverser();rootGroup.accept(visitor);if(currentSearch){var currentMatch=currentSearch.matches[currentMatchIndex];var matchIndex=0;var matches=[];var actOnLogEntry=function(logEntry){var logEntryMatches=logEntry.getSearchMatches();for(j=0,jLen=logEntryMatches.length;j<jLen;j++){matches[matchIndex]=logEntryMatches[j];if(currentMatch&&logEntryMatches[j].equals(currentMatch)){currentMatchIndex=matchIndex;}", "matchIndex++;}};if(newestAtTop){for(i=logEntries.length-1;i>=0;i--){actOnLogEntry(logEntries[i]);}}else{for(i=0,iLen=logEntries.length;i<iLen;i++){actOnLogEntry(logEntries[i]);}}", "currentSearch.matches=matches;if(currentMatch){currentMatch.setCurrent();}}else if(scrollToLatest){doScrollToLatest();}}", '$("newestAtTop").checked=isNewestAtTop;}', 'function toggleNewestAtTop(){var isNewestAtTop=$("newestAtTop").checked;setNewestAtTop(isNewestAtTop);}', "var scrollToLatest=true;function setScrollToLatest(isScrollToLatest){scrollToLatest=isScrollToLatest;if(scrollToLatest){doScrollToLatest();}", '$("scrollToLatest").checked=isScrollToLatest;}', 'function toggleScrollToLatest(){var isScrollToLatest=$("scrollToLatest").checked;setScrollToLatest(isScrollToLatest);}', 'function doScrollToLatest(){var l=logMainContainer;if(typeof l.scrollTop!="undefined"){if(newestAtTop){l.scrollTop=0;}else{var latestLogEntry=l.lastChild;if(latestLogEntry){l.scrollTop=l.scrollHeight;}}}}', "var closeIfOpenerCloses=true;function setCloseIfOpenerCloses(isCloseIfOpenerCloses){closeIfOpenerCloses=isCloseIfOpenerCloses;}", "var maxMessages=null;function setMaxMessages(max){maxMessages=max;pruneLogEntries();}", 'var showCommandLine=false;function setShowCommandLine(isShowCommandLine){showCommandLine=isShowCommandLine;if(loaded){$("commandLine").style.display=showCommandLine?"block":"none";setCommandInputWidth();setLogContainerHeight();}}', 'function focusCommandLine(){if(loaded){$("command").focus();}}', 'function focusSearch(){if(loaded){$("searchBox").focus();}}', "function getLogItems(){var items=[];for(var i=0,len=logItems.length;i<len;i++){logItems[i].serialize(items);}", "return items;}", "function setLogItems(items){var loggingReallyEnabled=loggingEnabled;loggingEnabled=true;for(var i=0,len=items.length;i<len;i++){switch(items[i][0]){case LogItem.serializedItemKeys.LOG_ENTRY:log(items[i][1],items[i][2]);break;case LogItem.serializedItemKeys.GROUP_START:group(items[i][1]);break;case LogItem.serializedItemKeys.GROUP_END:groupEnd();break;}}", "loggingEnabled=loggingReallyEnabled;}", "function log(logLevel,formattedMessage){if(loggingEnabled){var logEntry=new LogEntry(logLevel,formattedMessage);logEntries.push(logEntry);logEntriesAndSeparators.push(logEntry);logItems.push(logEntry);currentGroup.addChild(logEntry);if(loaded){if(logQueuedEventsTimer!==null){clearTimeout(logQueuedEventsTimer);}", "logQueuedEventsTimer=setTimeout(renderQueuedLogItems,renderDelay);unrenderedLogItemsExist=true;}}}", "function renderQueuedLogItems(){logQueuedEventsTimer=null;var pruned=pruneLogEntries();var initiallyHasMatches=currentSearch?currentSearch.hasMatches():false;for(var i=0,len=logItems.length;i<len;i++){if(!logItems[i].rendered){logItems[i].render();logItems[i].appendToLog();if(currentSearch&&(logItems[i]instanceof LogEntry)){currentSearch.applyTo(logItems[i]);}}}", "if(currentSearch){if(pruned){if(currentSearch.hasVisibleMatches()){if(currentMatchIndex===null){setCurrentMatchIndex(0);}", "displayMatches();}else{displayNoMatches();}}else if(!initiallyHasMatches&&currentSearch.hasVisibleMatches()){setCurrentMatchIndex(0);displayMatches();}}", "if(scrollToLatest){doScrollToLatest();}", "unrenderedLogItemsExist=false;}", "function pruneLogEntries(){if((maxMessages!==null)&&(logEntriesAndSeparators.length>maxMessages)){var numberToDelete=logEntriesAndSeparators.length-maxMessages;var prunedLogEntries=logEntriesAndSeparators.slice(0,numberToDelete);if(currentSearch){currentSearch.removeMatches(prunedLogEntries);}", "var group;for(var i=0;i<numberToDelete;i++){group=logEntriesAndSeparators[i].group;array_remove(logItems,logEntriesAndSeparators[i]);array_remove(logEntries,logEntriesAndSeparators[i]);logEntriesAndSeparators[i].remove(true,true);if(group.children.length===0&&group!==currentGroup&&group!==rootGroup){array_remove(logItems,group);group.remove(true,true);}}", "logEntriesAndSeparators=array_removeFromStart(logEntriesAndSeparators,numberToDelete);return true;}", "return false;}", 'function group(name,startExpanded){if(loggingEnabled){initiallyExpanded=(typeof startExpanded==="undefined")?true:Boolean(startExpanded);var newGroup=new Group(name,false,initiallyExpanded);currentGroup.addChild(newGroup);currentGroup=newGroup;logItems.push(newGroup);if(loaded){if(logQueuedEventsTimer!==null){clearTimeout(logQueuedEventsTimer);}', "logQueuedEventsTimer=setTimeout(renderQueuedLogItems,renderDelay);unrenderedLogItemsExist=true;}}}", "function groupEnd(){currentGroup=(currentGroup===rootGroup)?rootGroup:currentGroup.group;}", "function mainPageReloaded(){currentGroup=rootGroup;var separator=new Separator();logEntriesAndSeparators.push(separator);logItems.push(separator);currentGroup.addChild(separator);}", "function closeWindow(){if(appender&&mainWindowExists()){appender.close(true);}else{window.close();}}", "function hide(){if(appender&&mainWindowExists()){appender.hide();}}", 'var mainWindow=window;var windowId="log4javascriptConsoleWindow_"+new Date().getTime()+"_"+(""+Math.random()).substr(2);function setMainWindow(win){mainWindow=win;mainWindow[windowId]=window;if(opener&&closeIfOpenerCloses){pollOpener();}}', "function pollOpener(){if(closeIfOpenerCloses){if(mainWindowExists()){setTimeout(pollOpener,500);}else{closeWindow();}}}", "function mainWindowExists(){try{return(mainWindow&&!mainWindow.closed&&mainWindow[windowId]==window);}catch(ex){}", "return false;}", 'var logLevels=["TRACE","DEBUG","INFO","WARN","ERROR","FATAL"];function getCheckBox(logLevel){return $("switch_"+logLevel);}', 'function getIeWrappedLogContainer(){return $("log_wrapped");}', 'function getIeUnwrappedLogContainer(){return $("log_unwrapped");}', "function applyFilters(){for(var i=0;i<logLevels.length;i++){if(getCheckBox(logLevels[i]).checked){addClass(logMainContainer,logLevels[i]);}else{removeClass(logMainContainer,logLevels[i]);}}", "updateSearchFromFilters();}", 'function toggleAllLevels(){var turnOn=$("switch_ALL").checked;for(var i=0;i<logLevels.length;i++){getCheckBox(logLevels[i]).checked=turnOn;if(turnOn){addClass(logMainContainer,logLevels[i]);}else{removeClass(logMainContainer,logLevels[i]);}}}', 'function checkAllLevels(){for(var i=0;i<logLevels.length;i++){if(!getCheckBox(logLevels[i]).checked){getCheckBox("ALL").checked=false;return;}}', 'getCheckBox("ALL").checked=true;}', "function clearLog(){rootGroup.clear();currentGroup=rootGroup;logEntries=[];logItems=[];logEntriesAndSeparators=[];doSearch();}", 'function toggleWrap(){var enable=$("wrap").checked;if(enable){addClass(logMainContainer,"wrap");}else{removeClass(logMainContainer,"wrap");}', "refreshCurrentMatch();}", "var searchTimer=null;function scheduleSearch(){try{clearTimeout(searchTimer);}catch(ex){}", "searchTimer=setTimeout(doSearch,500);}", "function Search(searchTerm,isRegex,searchRegex,isCaseSensitive){this.searchTerm=searchTerm;this.isRegex=isRegex;this.searchRegex=searchRegex;this.isCaseSensitive=isCaseSensitive;this.matches=[];}", "Search.prototype={hasMatches:function(){return this.matches.length>0;},hasVisibleMatches:function(){if(this.hasMatches()){for(var i=0;i<this.matches.length;i++){if(this.matches[i].isVisible()){return true;}}}", "return false;},match:function(logEntry){var entryText=String(logEntry.formattedMessage);var matchesSearch=false;if(this.isRegex){matchesSearch=this.searchRegex.test(entryText);}else if(this.isCaseSensitive){matchesSearch=(entryText.indexOf(this.searchTerm)>-1);}else{matchesSearch=(entryText.toLowerCase().indexOf(this.searchTerm.toLowerCase())>-1);}", "return matchesSearch;},getNextVisibleMatchIndex:function(){for(var i=currentMatchIndex+1;i<this.matches.length;i++){if(this.matches[i].isVisible()){return i;}}", "for(i=0;i<=currentMatchIndex;i++){if(this.matches[i].isVisible()){return i;}}", "return-1;},getPreviousVisibleMatchIndex:function(){for(var i=currentMatchIndex-1;i>=0;i--){if(this.matches[i].isVisible()){return i;}}", "for(var i=this.matches.length-1;i>=currentMatchIndex;i--){if(this.matches[i].isVisible()){return i;}}", 'return-1;},applyTo:function(logEntry){var doesMatch=this.match(logEntry);if(doesMatch){logEntry.group.expand();logEntry.setSearchMatch(true);var logEntryContent;var wrappedLogEntryContent;var searchTermReplacementStartTag="<span class=\\"searchterm\\">";var searchTermReplacementEndTag="<"+"/span>";var preTagName=isIe?"pre":"span";var preStartTag="<"+preTagName+" class=\\"pre\\">";var preEndTag="<"+"/"+preTagName+">";var startIndex=0;var searchIndex,matchedText,textBeforeMatch;if(this.isRegex){var flags=this.isCaseSensitive?"g":"gi";var capturingRegex=new RegExp("("+this.searchRegex.source+")",flags);var rnd=(""+Math.random()).substr(2);var startToken="%%s"+rnd+"%%";var endToken="%%e"+rnd+"%%";logEntryContent=logEntry.formattedMessage.replace(capturingRegex,startToken+"$1"+endToken);logEntryContent=escapeHtml(logEntryContent);var result;var searchString=logEntryContent;logEntryContent="";wrappedLogEntryContent="";while((searchIndex=searchString.indexOf(startToken,startIndex))>-1){var endTokenIndex=searchString.indexOf(endToken,searchIndex);matchedText=searchString.substring(searchIndex+startToken.length,endTokenIndex);textBeforeMatch=searchString.substring(startIndex,searchIndex);logEntryContent+=preStartTag+textBeforeMatch+preEndTag;logEntryContent+=searchTermReplacementStartTag+preStartTag+matchedText+', "preEndTag+searchTermReplacementEndTag;if(isIe){wrappedLogEntryContent+=textBeforeMatch+searchTermReplacementStartTag+", "matchedText+searchTermReplacementEndTag;}", "startIndex=endTokenIndex+endToken.length;}", 'logEntryContent+=preStartTag+searchString.substr(startIndex)+preEndTag;if(isIe){wrappedLogEntryContent+=searchString.substr(startIndex);}}else{logEntryContent="";wrappedLogEntryContent="";var searchTermReplacementLength=searchTermReplacementStartTag.length+', "this.searchTerm.length+searchTermReplacementEndTag.length;var searchTermLength=this.searchTerm.length;var searchTermLowerCase=this.searchTerm.toLowerCase();var logTextLowerCase=logEntry.formattedMessage.toLowerCase();while((searchIndex=logTextLowerCase.indexOf(searchTermLowerCase,startIndex))>-1){matchedText=escapeHtml(logEntry.formattedMessage.substr(searchIndex,this.searchTerm.length));textBeforeMatch=escapeHtml(logEntry.formattedMessage.substring(startIndex,searchIndex));var searchTermReplacement=searchTermReplacementStartTag+", "preStartTag+matchedText+preEndTag+searchTermReplacementEndTag;logEntryContent+=preStartTag+textBeforeMatch+preEndTag+searchTermReplacement;if(isIe){wrappedLogEntryContent+=textBeforeMatch+searchTermReplacementStartTag+", "matchedText+searchTermReplacementEndTag;}", "startIndex=searchIndex+searchTermLength;}", "var textAfterLastMatch=escapeHtml(logEntry.formattedMessage.substr(startIndex));logEntryContent+=preStartTag+textAfterLastMatch+preEndTag;if(isIe){wrappedLogEntryContent+=textAfterLastMatch;}}", "logEntry.setContent(logEntryContent,wrappedLogEntryContent);var logEntryMatches=logEntry.getSearchMatches();this.matches=this.matches.concat(logEntryMatches);}else{logEntry.setSearchMatch(false);logEntry.setContent(logEntry.formattedMessage,logEntry.formattedMessage);}", "return doesMatch;},removeMatches:function(logEntries){var matchesToRemoveCount=0;var currentMatchRemoved=false;var matchesToRemove=[];var i,iLen,j,jLen;for(i=0,iLen=this.matches.length;i<iLen;i++){for(j=0,jLen=logEntries.length;j<jLen;j++){if(this.matches[i].belongsTo(logEntries[j])){matchesToRemove.push(this.matches[i]);if(i===currentMatchIndex){currentMatchRemoved=true;}}}}", "var newMatch=currentMatchRemoved?null:this.matches[currentMatchIndex];if(currentMatchRemoved){for(i=currentMatchIndex,iLen=this.matches.length;i<iLen;i++){if(this.matches[i].isVisible()&&!array_contains(matchesToRemove,this.matches[i])){newMatch=this.matches[i];break;}}}", "for(i=0,iLen=matchesToRemove.length;i<iLen;i++){array_remove(this.matches,matchesToRemove[i]);matchesToRemove[i].remove();}", "if(this.hasVisibleMatches()){if(newMatch===null){setCurrentMatchIndex(0);}else{var newMatchIndex=0;for(i=0,iLen=this.matches.length;i<iLen;i++){if(newMatch===this.matches[i]){newMatchIndex=i;break;}}", "setCurrentMatchIndex(newMatchIndex);}}else{currentMatchIndex=null;displayNoMatches();}}};function getPageOffsetTop(el,container){var currentEl=el;var y=0;while(currentEl&&currentEl!=container){y+=currentEl.offsetTop;currentEl=currentEl.offsetParent;}", "return y;}", 'function scrollIntoView(el){var logContainer=logMainContainer;if(!$("wrap").checked){var logContainerLeft=logContainer.scrollLeft;var logContainerRight=logContainerLeft+logContainer.offsetWidth;var elLeft=el.offsetLeft;var elRight=elLeft+el.offsetWidth;if(elLeft<logContainerLeft||elRight>logContainerRight){logContainer.scrollLeft=elLeft-(logContainer.offsetWidth-el.offsetWidth)/2;}}', "var logContainerTop=logContainer.scrollTop;var logContainerBottom=logContainerTop+logContainer.offsetHeight;var elTop=getPageOffsetTop(el)-getToolBarsHeight();var elBottom=elTop+el.offsetHeight;if(elTop<logContainerTop||elBottom>logContainerBottom){logContainer.scrollTop=elTop-(logContainer.offsetHeight-el.offsetHeight)/2;}}", "function Match(logEntryLevel,spanInMainDiv,spanInUnwrappedPre,spanInWrappedDiv){this.logEntryLevel=logEntryLevel;this.spanInMainDiv=spanInMainDiv;if(isIe){this.spanInUnwrappedPre=spanInUnwrappedPre;this.spanInWrappedDiv=spanInWrappedDiv;}", "this.mainSpan=isIe?spanInUnwrappedPre:spanInMainDiv;}", 'Match.prototype={equals:function(match){return this.mainSpan===match.mainSpan;},setCurrent:function(){if(isIe){addClass(this.spanInUnwrappedPre,"currentmatch");addClass(this.spanInWrappedDiv,"currentmatch");var elementToScroll=$("wrap").checked?this.spanInWrappedDiv:this.spanInUnwrappedPre;scrollIntoView(elementToScroll);}else{addClass(this.spanInMainDiv,"currentmatch");scrollIntoView(this.spanInMainDiv);}},belongsTo:function(logEntry){if(isIe){return isDescendant(this.spanInUnwrappedPre,logEntry.unwrappedPre);}else{return isDescendant(this.spanInMainDiv,logEntry.mainDiv);}},setNotCurrent:function(){if(isIe){removeClass(this.spanInUnwrappedPre,"currentmatch");removeClass(this.spanInWrappedDiv,"currentmatch");}else{removeClass(this.spanInMainDiv,"currentmatch");}},isOrphan:function(){return isOrphan(this.mainSpan);},isVisible:function(){return getCheckBox(this.logEntryLevel).checked;},remove:function(){if(isIe){this.spanInUnwrappedPre=null;this.spanInWrappedDiv=null;}else{this.spanInMainDiv=null;}}};var currentSearch=null;var currentMatchIndex=null;function doSearch(){var searchBox=$("searchBox");var searchTerm=searchBox.value;var isRegex=$("searchRegex").checked;var isCaseSensitive=$("searchCaseSensitive").checked;var i;if(searchTerm===""){$("searchReset").disabled=true;$("searchNav").style.display="none";removeClass(document.body,"searching");removeClass(searchBox,"hasmatches");removeClass(searchBox,"nomatches");for(i=0;i<logEntries.length;i++){logEntries[i].clearSearch();logEntries[i].setContent(logEntries[i].formattedMessage,logEntries[i].formattedMessage);}', 'currentSearch=null;setLogContainerHeight();}else{$("searchReset").disabled=false;$("searchNav").style.display="block";var searchRegex;var regexValid;if(isRegex){try{searchRegex=isCaseSensitive?new RegExp(searchTerm,"g"):new RegExp(searchTerm,"gi");regexValid=true;replaceClass(searchBox,"validregex","invalidregex");searchBox.title="Valid regex";}catch(ex){regexValid=false;replaceClass(searchBox,"invalidregex","validregex");searchBox.title="Invalid regex: "+(ex.message?ex.message:(ex.description?ex.description:"unknown error"));return;}}else{searchBox.title="";removeClass(searchBox,"validregex");removeClass(searchBox,"invalidregex");}', 'addClass(document.body,"searching");currentSearch=new Search(searchTerm,isRegex,searchRegex,isCaseSensitive);for(i=0;i<logEntries.length;i++){currentSearch.applyTo(logEntries[i]);}', "setLogContainerHeight();if(currentSearch.hasVisibleMatches()){setCurrentMatchIndex(0);displayMatches();}else{displayNoMatches();}}}", "function updateSearchFromFilters(){if(currentSearch){if(currentSearch.hasMatches()){if(currentMatchIndex===null){currentMatchIndex=0;}", "var currentMatch=currentSearch.matches[currentMatchIndex];if(currentMatch.isVisible()){displayMatches();setCurrentMatchIndex(currentMatchIndex);}else{currentMatch.setNotCurrent();var nextVisibleMatchIndex=currentSearch.getNextVisibleMatchIndex();if(nextVisibleMatchIndex>-1){setCurrentMatchIndex(nextVisibleMatchIndex);displayMatches();}else{displayNoMatches();}}}else{displayNoMatches();}}}", "function refreshCurrentMatch(){if(currentSearch&&currentSearch.hasVisibleMatches()){setCurrentMatchIndex(currentMatchIndex);}}", 'function displayMatches(){replaceClass($("searchBox"),"hasmatches","nomatches");$("searchBox").title=""+currentSearch.matches.length+" matches found";$("searchNav").style.display="block";setLogContainerHeight();}', 'function displayNoMatches(){replaceClass($("searchBox"),"nomatches","hasmatches");$("searchBox").title="No matches found";$("searchNav").style.display="none";setLogContainerHeight();}', 'function toggleSearchEnabled(enable){enable=(typeof enable=="undefined")?!$("searchDisable").checked:enable;$("searchBox").disabled=!enable;$("searchReset").disabled=!enable;$("searchRegex").disabled=!enable;$("searchNext").disabled=!enable;$("searchPrevious").disabled=!enable;$("searchCaseSensitive").disabled=!enable;$("searchNav").style.display=(enable&&($("searchBox").value!=="")&&currentSearch&&currentSearch.hasVisibleMatches())?"block":"none";if(enable){removeClass($("search"),"greyedout");addClass(document.body,"searching");if($("searchHighlight").checked){addClass(logMainContainer,"searchhighlight");}else{removeClass(logMainContainer,"searchhighlight");}', 'if($("searchFilter").checked){addClass(logMainContainer,"searchfilter");}else{removeClass(logMainContainer,"searchfilter");}', '$("searchDisable").checked=!enable;}else{addClass($("search"),"greyedout");removeClass(document.body,"searching");removeClass(logMainContainer,"searchhighlight");removeClass(logMainContainer,"searchfilter");}', "setLogContainerHeight();}", 'function toggleSearchFilter(){var enable=$("searchFilter").checked;if(enable){addClass(logMainContainer,"searchfilter");}else{removeClass(logMainContainer,"searchfilter");}', "refreshCurrentMatch();}", 'function toggleSearchHighlight(){var enable=$("searchHighlight").checked;if(enable){addClass(logMainContainer,"searchhighlight");}else{removeClass(logMainContainer,"searchhighlight");}}', 'function clearSearch(){$("searchBox").value="";doSearch();}', 'function searchNext(){if(currentSearch!==null&&currentMatchIndex!==null){currentSearch.matches[currentMatchIndex].setNotCurrent();var nextMatchIndex=currentSearch.getNextVisibleMatchIndex();if(nextMatchIndex>currentMatchIndex||confirm("Reached the end of the page. Start from the top?")){setCurrentMatchIndex(nextMatchIndex);}}}', 'function searchPrevious(){if(currentSearch!==null&&currentMatchIndex!==null){currentSearch.matches[currentMatchIndex].setNotCurrent();var previousMatchIndex=currentSearch.getPreviousVisibleMatchIndex();if(previousMatchIndex<currentMatchIndex||confirm("Reached the start of the page. Continue from the bottom?")){setCurrentMatchIndex(previousMatchIndex);}}}', "function setCurrentMatchIndex(index){currentMatchIndex=index;currentSearch.matches[currentMatchIndex].setCurrent();}", 'function addClass(el,cssClass){if(!hasClass(el,cssClass)){if(el.className){el.className+=" "+cssClass;}else{el.className=cssClass;}}}', 'function hasClass(el,cssClass){if(el.className){var classNames=el.className.split(" ");return array_contains(classNames,cssClass);}', "return false;}", 'function removeClass(el,cssClass){if(hasClass(el,cssClass)){var existingClasses=el.className.split(" ");var newClasses=[];for(var i=0,len=existingClasses.length;i<len;i++){if(existingClasses[i]!=cssClass){newClasses[newClasses.length]=existingClasses[i];}}', 'el.className=newClasses.join(" ");}}', "function replaceClass(el,newCssClass,oldCssClass){removeClass(el,oldCssClass);addClass(el,newCssClass);}", "function getElementsByClass(el,cssClass,tagName){var elements=el.getElementsByTagName(tagName);var matches=[];for(var i=0,len=elements.length;i<len;i++){if(hasClass(elements[i],cssClass)){matches.push(elements[i]);}}", "return matches;}", "function $(id){return document.getElementById(id);}", "function isDescendant(node,ancestorNode){while(node!=null){if(node===ancestorNode){return true;}", "node=node.parentNode;}", "return false;}", "function isOrphan(node){var currentNode=node;while(currentNode){if(currentNode==document.body){return false;}", "currentNode=currentNode.parentNode;}", "return true;}", 'function escapeHtml(str){return str.replace(/&/g,"&amp;").replace(/[<]/g,"&lt;").replace(/>/g,"&gt;");}', "function getWindowWidth(){if(window.innerWidth){return window.innerWidth;}else if(document.documentElement&&document.documentElement.clientWidth){return document.documentElement.clientWidth;}else if(document.body){return document.body.clientWidth;}", "return 0;}", "function getWindowHeight(){if(window.innerHeight){return window.innerHeight;}else if(document.documentElement&&document.documentElement.clientHeight){return document.documentElement.clientHeight;}else if(document.body){return document.body.clientHeight;}", "return 0;}", 'function getToolBarsHeight(){return $("switches").offsetHeight;}', 'function getChromeHeight(){var height=getToolBarsHeight();if(showCommandLine){height+=$("commandLine").offsetHeight;}', "return height;}", 'function setLogContainerHeight(){if(logMainContainer){var windowHeight=getWindowHeight();$("body").style.height=getWindowHeight()+"px";logMainContainer.style.height=""+', 'Math.max(0,windowHeight-getChromeHeight())+"px";}}', 'function setCommandInputWidth(){if(showCommandLine){$("command").style.width=""+Math.max(0,$("commandLineContainer").offsetWidth-', '($("evaluateButton").offsetWidth+13))+"px";}}', "window.onresize=function(){setCommandInputWidth();setLogContainerHeight();};if(!Array.prototype.push){Array.prototype.push=function(){for(var i=0,len=arguments.length;i<len;i++){this[this.length]=arguments[i];}", "return this.length;};}", "if(!Array.prototype.pop){Array.prototype.pop=function(){if(this.length>0){var val=this[this.length-1];this.length=this.length-1;return val;}};}", "if(!Array.prototype.shift){Array.prototype.shift=function(){if(this.length>0){var firstItem=this[0];for(var i=0,len=this.length-1;i<len;i++){this[i]=this[i+1];}", "this.length=this.length-1;return firstItem;}};}", "if(!Array.prototype.splice){Array.prototype.splice=function(startIndex,deleteCount){var itemsAfterDeleted=this.slice(startIndex+deleteCount);var itemsDeleted=this.slice(startIndex,startIndex+deleteCount);this.length=startIndex;var argumentsArray=[];for(var i=0,len=arguments.length;i<len;i++){argumentsArray[i]=arguments[i];}", "var itemsToAppend=(argumentsArray.length>2)?itemsAfterDeleted=argumentsArray.slice(2).concat(itemsAfterDeleted):itemsAfterDeleted;for(i=0,len=itemsToAppend.length;i<len;i++){this.push(itemsToAppend[i]);}", "return itemsDeleted;};}", "function array_remove(arr,val){var index=-1;for(var i=0,len=arr.length;i<len;i++){if(arr[i]===val){index=i;break;}}", "if(index>=0){arr.splice(index,1);return index;}else{return false;}}", "function array_removeFromStart(array,numberToRemove){if(Array.prototype.splice){array.splice(0,numberToRemove);}else{for(var i=numberToRemove,len=array.length;i<len;i++){array[i-numberToRemove]=array[i];}", "array.length=array.length-numberToRemove;}", "return array;}", "function array_contains(arr,val){for(var i=0,len=arr.length;i<len;i++){if(arr[i]==val){return true;}}", "return false;}", "function getErrorMessage(ex){if(ex.message){return ex.message;}else if(ex.description){return ex.description;}", 'return""+ex;}', "function moveCaretToEnd(input){if(input.setSelectionRange){input.focus();var length=input.value.length;input.setSelectionRange(length,length);}else if(input.createTextRange){var range=input.createTextRange();range.collapse(false);range.select();}", "input.focus();}", 'function stopPropagation(evt){if(evt.stopPropagation){evt.stopPropagation();}else if(typeof evt.cancelBubble!="undefined"){evt.cancelBubble=true;}}', "function getEvent(evt){return evt?evt:event;}", "function getTarget(evt){return evt.target?evt.target:evt.srcElement;}", 'function getRelatedTarget(evt){if(evt.relatedTarget){return evt.relatedTarget;}else if(evt.srcElement){switch(evt.type){case"mouseover":return evt.fromElement;case"mouseout":return evt.toElement;default:return evt.srcElement;}}}', "function cancelKeyEvent(evt){evt.returnValue=false;stopPropagation(evt);}", 'function evalCommandLine(){var expr=$("command").value;evalCommand(expr);$("command").value="";}', "function evalLastCommand(){if(lastCommand!=null){evalCommand(lastCommand);}}", 'var lastCommand=null;var commandHistory=[];var currentCommandIndex=0;function evalCommand(expr){if(appender){appender.evalCommandAndAppend(expr);}else{var prefix=">>> "+expr+"\\r\\n";try{log("INFO",prefix+eval(expr));}catch(ex){log("ERROR",prefix+"Error: "+getErrorMessage(ex));}}', "if(expr!=commandHistory[commandHistory.length-1]){commandHistory.push(expr);if(appender){appender.storeCommandHistory(commandHistory);}}", "currentCommandIndex=(expr==commandHistory[currentCommandIndex])?currentCommandIndex+1:commandHistory.length;lastCommand=expr;}", "//]]>", "</script>", '<style type="text/css">', "body{background-color:white;color:black;padding:0;margin:0;font-family:tahoma,verdana,arial,helvetica,sans-serif;overflow:hidden}div#switchesContainer input{margin-bottom:0}div.toolbar{border-top:solid #ffffff 1px;border-bottom:solid #aca899 1px;background-color:#f1efe7;padding:3px 5px;font-size:68.75%}div.toolbar,div#search input{font-family:tahoma,verdana,arial,helvetica,sans-serif}div.toolbar input.button{padding:0 5px;font-size:100%}div.toolbar input.hidden{display:none}div#switches input#clearButton{margin-left:20px}div#levels label{font-weight:bold}div#levels label,div#options label{margin-right:5px}div#levels label#wrapLabel{font-weight:normal}div#search label{margin-right:10px}div#search label.searchboxlabel{margin-right:0}div#search input{font-size:100%}div#search input.validregex{color:green}div#search input.invalidregex{color:red}div#search input.nomatches{color:white;background-color:#ff6666}div#search input.nomatches{color:white;background-color:#ff6666}div#searchNav{display:none}div#commandLine{display:none}div#commandLine input#command{font-size:100%;font-family:Courier New,Courier}div#commandLine input#evaluateButton{}*.greyedout{color:gray !important;border-color:gray !important}*.greyedout *.alwaysenabled{color:black}*.unselectable{-khtml-user-select:none;-moz-user-select:none;user-select:none}div#log{font-family:Courier New,Courier;font-size:75%;width:100%;overflow:auto;clear:both;position:relative}div.group{border-color:#cccccc;border-style:solid;border-width:1px 0 1px 1px;overflow:visible}div.oldIe div.group,div.oldIe div.group *,div.oldIe *.logentry{height:1%}div.group div.groupheading span.expander{border:solid black 1px;font-family:Courier New,Courier;font-size:0.833em;background-color:#eeeeee;position:relative;top:-1px;color:black;padding:0 2px;cursor:pointer;cursor:hand;height:1%}div.group div.groupcontent{margin-left:10px;padding-bottom:2px;overflow:visible}div.group div.expanded{display:block}div.group div.collapsed{display:none}*.logentry{overflow:visible;display:none;white-space:pre}span.pre{white-space:pre}pre.unwrapped{display:inline !important}pre.unwrapped pre.pre,div.wrapped pre.pre{display:inline}div.wrapped pre.pre{white-space:normal}div.wrapped{display:none}body.searching *.logentry span.currentmatch{color:white !important;background-color:green !important}body.searching div.searchhighlight *.logentry span.searchterm{color:black;background-color:yellow}div.wrap *.logentry{white-space:normal !important;border-width:0 0 1px 0;border-color:#dddddd;border-style:dotted}div.wrap #log_wrapped,#log_unwrapped{display:block}div.wrap #log_unwrapped,#log_wrapped{display:none}div.wrap *.logentry span.pre{overflow:visible;white-space:normal}div.wrap *.logentry pre.unwrapped{display:none}div.wrap *.logentry span.wrapped{display:inline}div.searchfilter *.searchnonmatch{display:none !important}div#log *.TRACE,label#label_TRACE{color:#666666}div#log *.DEBUG,label#label_DEBUG{color:green}div#log *.INFO,label#label_INFO{color:#000099}div#log *.WARN,label#label_WARN{color:#999900}div#log *.ERROR,label#label_ERROR{color:red}div#log *.FATAL,label#label_FATAL{color:#660066}div.TRACE#log *.TRACE,div.DEBUG#log *.DEBUG,div.INFO#log *.INFO,div.WARN#log *.WARN,div.ERROR#log *.ERROR,div.FATAL#log *.FATAL{display:block}div#log div.separator{background-color:#cccccc;margin:5px 0;line-height:1px}", "</style>", "</head>", '<body id="body">', '<div id="switchesContainer">', '<div id="switches">', '<div id="levels" class="toolbar">', "Filters:", '<input type="checkbox" id="switch_TRACE" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide trace messages" /><label for="switch_TRACE" id="label_TRACE">trace</label>', '<input type="checkbox" id="switch_DEBUG" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide debug messages" /><label for="switch_DEBUG" id="label_DEBUG">debug</label>', '<input type="checkbox" id="switch_INFO" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide info messages" /><label for="switch_INFO" id="label_INFO">info</label>', '<input type="checkbox" id="switch_WARN" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide warn messages" /><label for="switch_WARN" id="label_WARN">warn</label>', '<input type="checkbox" id="switch_ERROR" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide error messages" /><label for="switch_ERROR" id="label_ERROR">error</label>', '<input type="checkbox" id="switch_FATAL" onclick="applyFilters(); checkAllLevels()" checked="checked" title="Show/hide fatal messages" /><label for="switch_FATAL" id="label_FATAL">fatal</label>', '<input type="checkbox" id="switch_ALL" onclick="toggleAllLevels(); applyFilters()" checked="checked" title="Show/hide all messages" /><label for="switch_ALL" id="label_ALL">all</label>', "</div>", '<div id="search" class="toolbar">', '<label for="searchBox" class="searchboxlabel">Search:</label> <input type="text" id="searchBox" onclick="toggleSearchEnabled(true)" onkeyup="scheduleSearch()" size="20" />', '<input type="button" id="searchReset" disabled="disabled" value="Reset" onclick="clearSearch()" class="button" title="Reset the search" />', '<input type="checkbox" id="searchRegex" onclick="doSearch()" title="If checked, search is treated as a regular expression" /><label for="searchRegex">Regex</label>', '<input type="checkbox" id="searchCaseSensitive" onclick="doSearch()" title="If checked, search is case sensitive" /><label for="searchCaseSensitive">Match case</label>', '<input type="checkbox" id="searchDisable" onclick="toggleSearchEnabled()" title="Enable/disable search" /><label for="searchDisable" class="alwaysenabled">Disable</label>', '<div id="searchNav">', '<input type="button" id="searchNext" disabled="disabled" value="Next" onclick="searchNext()" class="button" title="Go to the next matching log entry" />', '<input type="button" id="searchPrevious" disabled="disabled" value="Previous" onclick="searchPrevious()" class="button" title="Go to the previous matching log entry" />', '<input type="checkbox" id="searchFilter" onclick="toggleSearchFilter()" title="If checked, non-matching log entries are filtered out" /><label for="searchFilter">Filter</label>', '<input type="checkbox" id="searchHighlight" onclick="toggleSearchHighlight()" title="Highlight matched search terms" /><label for="searchHighlight" class="alwaysenabled">Highlight all</label>', "</div>", "</div>", '<div id="options" class="toolbar">', "Options:", '<input type="checkbox" id="enableLogging" onclick="toggleLoggingEnabled()" checked="checked" title="Enable/disable logging" /><label for="enableLogging" id="enableLoggingLabel">Log</label>', '<input type="checkbox" id="wrap" onclick="toggleWrap()" title="Enable / disable word wrap" /><label for="wrap" id="wrapLabel">Wrap</label>', '<input type="checkbox" id="newestAtTop" onclick="toggleNewestAtTop()" title="If checked, causes newest messages to appear at the top" /><label for="newestAtTop" id="newestAtTopLabel">Newest at the top</label>', '<input type="checkbox" id="scrollToLatest" onclick="toggleScrollToLatest()" checked="checked" title="If checked, window automatically scrolls to a new message when it is added" /><label for="scrollToLatest" id="scrollToLatestLabel">Scroll to latest</label>', '<input type="button" id="clearButton" value="Clear" onclick="clearLog()" class="button" title="Clear all log messages"  />', '<input type="button" id="hideButton" value="Hide" onclick="hide()" class="hidden button" title="Hide the console" />', '<input type="button" id="closeButton" value="Close" onclick="closeWindow()" class="hidden button" title="Close the window" />', "</div>", "</div>", "</div>", '<div id="log" class="TRACE DEBUG INFO WARN ERROR FATAL"></div>', '<div id="commandLine" class="toolbar">', '<div id="commandLineContainer">', '<input type="text" id="command" title="Enter a JavaScript command here and hit return or press \'Evaluate\'" />', '<input type="button" id="evaluateButton" value="Evaluate" class="button" title="Evaluate the command" onclick="evalCommandLine()" />', "</div>", "</div>", "</body>", "</html>", "" ];
        };
        var defaultCommandLineFunctions = [];
        ConsoleAppender = function() {};
        var consoleAppenderIdCounter = 1;
        ConsoleAppender.prototype = new Appender();
        ConsoleAppender.prototype.create = function(inPage, container, lazyInit, initiallyMinimized, useDocumentWrite, width, height, focusConsoleWindow) {
            var appender = this;
            var initialized = false;
            var consoleWindowCreated = false;
            var consoleWindowLoaded = false;
            var consoleClosed = false;
            var queuedLoggingEvents = [];
            var isSupported = true;
            var consoleAppenderId = consoleAppenderIdCounter++;
            initiallyMinimized = extractBooleanFromParam(initiallyMinimized, this.defaults.initiallyMinimized);
            lazyInit = extractBooleanFromParam(lazyInit, this.defaults.lazyInit);
            useDocumentWrite = extractBooleanFromParam(useDocumentWrite, this.defaults.useDocumentWrite);
            var newestMessageAtTop = this.defaults.newestMessageAtTop;
            var scrollToLatestMessage = this.defaults.scrollToLatestMessage;
            width = width ? width : this.defaults.width;
            height = height ? height : this.defaults.height;
            var maxMessages = this.defaults.maxMessages;
            var showCommandLine = this.defaults.showCommandLine;
            var commandLineObjectExpansionDepth = this.defaults.commandLineObjectExpansionDepth;
            var showHideButton = this.defaults.showHideButton;
            var showCloseButton = this.defaults.showCloseButton;
            var showLogEntryDeleteButtons = this.defaults.showLogEntryDeleteButtons;
            this.setLayout(this.defaults.layout);
            var init, createWindow, safeToAppend, getConsoleWindow, open;
            var appenderName = inPage ? "InPageAppender" : "PopUpAppender";
            var checkCanConfigure = function(configOptionName) {
                if (consoleWindowCreated) {
                    handleError(appenderName + ": configuration option '" + configOptionName + "' may not be set after the appender has been initialized");
                    return false;
                }
                return true;
            };
            var consoleWindowExists = function() {
                return consoleWindowLoaded && isSupported && !consoleClosed;
            };
            this.isNewestMessageAtTop = function() {
                return newestMessageAtTop;
            };
            this.setNewestMessageAtTop = function(newestMessageAtTopParam) {
                newestMessageAtTop = bool(newestMessageAtTopParam);
                if (consoleWindowExists()) {
                    getConsoleWindow().setNewestAtTop(newestMessageAtTop);
                }
            };
            this.isScrollToLatestMessage = function() {
                return scrollToLatestMessage;
            };
            this.setScrollToLatestMessage = function(scrollToLatestMessageParam) {
                scrollToLatestMessage = bool(scrollToLatestMessageParam);
                if (consoleWindowExists()) {
                    getConsoleWindow().setScrollToLatest(scrollToLatestMessage);
                }
            };
            this.getWidth = function() {
                return width;
            };
            this.setWidth = function(widthParam) {
                if (checkCanConfigure("width")) {
                    width = extractStringFromParam(widthParam, width);
                }
            };
            this.getHeight = function() {
                return height;
            };
            this.setHeight = function(heightParam) {
                if (checkCanConfigure("height")) {
                    height = extractStringFromParam(heightParam, height);
                }
            };
            this.getMaxMessages = function() {
                return maxMessages;
            };
            this.setMaxMessages = function(maxMessagesParam) {
                maxMessages = extractIntFromParam(maxMessagesParam, maxMessages);
                if (consoleWindowExists()) {
                    getConsoleWindow().setMaxMessages(maxMessages);
                }
            };
            this.isShowCommandLine = function() {
                return showCommandLine;
            };
            this.setShowCommandLine = function(showCommandLineParam) {
                showCommandLine = bool(showCommandLineParam);
                if (consoleWindowExists()) {
                    getConsoleWindow().setShowCommandLine(showCommandLine);
                }
            };
            this.isShowHideButton = function() {
                return showHideButton;
            };
            this.setShowHideButton = function(showHideButtonParam) {
                showHideButton = bool(showHideButtonParam);
                if (consoleWindowExists()) {
                    getConsoleWindow().setShowHideButton(showHideButton);
                }
            };
            this.isShowCloseButton = function() {
                return showCloseButton;
            };
            this.setShowCloseButton = function(showCloseButtonParam) {
                showCloseButton = bool(showCloseButtonParam);
                if (consoleWindowExists()) {
                    getConsoleWindow().setShowCloseButton(showCloseButton);
                }
            };
            this.getCommandLineObjectExpansionDepth = function() {
                return commandLineObjectExpansionDepth;
            };
            this.setCommandLineObjectExpansionDepth = function(commandLineObjectExpansionDepthParam) {
                commandLineObjectExpansionDepth = extractIntFromParam(commandLineObjectExpansionDepthParam, commandLineObjectExpansionDepth);
            };
            var minimized = initiallyMinimized;
            this.isInitiallyMinimized = function() {
                return initiallyMinimized;
            };
            this.setInitiallyMinimized = function(initiallyMinimizedParam) {
                if (checkCanConfigure("initiallyMinimized")) {
                    initiallyMinimized = bool(initiallyMinimizedParam);
                    minimized = initiallyMinimized;
                }
            };
            this.isUseDocumentWrite = function() {
                return useDocumentWrite;
            };
            this.setUseDocumentWrite = function(useDocumentWriteParam) {
                if (checkCanConfigure("useDocumentWrite")) {
                    useDocumentWrite = bool(useDocumentWriteParam);
                }
            };
            function QueuedLoggingEvent(loggingEvent, formattedMessage) {
                this.loggingEvent = loggingEvent;
                this.levelName = loggingEvent.level.name;
                this.formattedMessage = formattedMessage;
            }
            QueuedLoggingEvent.prototype.append = function() {
                getConsoleWindow().log(this.levelName, this.formattedMessage);
            };
            function QueuedGroup(name, initiallyExpanded) {
                this.name = name;
                this.initiallyExpanded = initiallyExpanded;
            }
            QueuedGroup.prototype.append = function() {
                getConsoleWindow().group(this.name, this.initiallyExpanded);
            };
            function QueuedGroupEnd() {}
            QueuedGroupEnd.prototype.append = function() {
                getConsoleWindow().groupEnd();
            };
            var checkAndAppend = function() {
                safeToAppend();
                if (!initialized) {
                    init();
                } else if (consoleClosed && reopenWhenClosed) {
                    createWindow();
                }
                if (safeToAppend()) {
                    appendQueuedLoggingEvents();
                }
            };
            this.append = function(loggingEvent) {
                if (isSupported) {
                    var formattedMessage = appender.getLayout().format(loggingEvent);
                    if (this.getLayout().ignoresThrowable()) {
                        formattedMessage += loggingEvent.getThrowableStrRep();
                    }
                    queuedLoggingEvents.push(new QueuedLoggingEvent(loggingEvent, formattedMessage));
                    checkAndAppend();
                }
            };
            this.group = function(name, initiallyExpanded) {
                if (isSupported) {
                    queuedLoggingEvents.push(new QueuedGroup(name, initiallyExpanded));
                    checkAndAppend();
                }
            };
            this.groupEnd = function() {
                if (isSupported) {
                    queuedLoggingEvents.push(new QueuedGroupEnd());
                    checkAndAppend();
                }
            };
            var appendQueuedLoggingEvents = function() {
                var currentLoggingEvent;
                while (queuedLoggingEvents.length > 0) {
                    queuedLoggingEvents.shift().append();
                }
                if (focusConsoleWindow) {
                    getConsoleWindow().focus();
                }
            };
            this.setAddedToLogger = function(logger) {
                this.loggers.push(logger);
                if (enabled && !lazyInit) {
                    init();
                }
            };
            this.clear = function() {
                if (consoleWindowExists()) {
                    getConsoleWindow().clearLog();
                }
                queuedLoggingEvents.length = 0;
            };
            this.focus = function() {
                if (consoleWindowExists()) {
                    getConsoleWindow().focus();
                }
            };
            this.focusCommandLine = function() {
                if (consoleWindowExists()) {
                    getConsoleWindow().focusCommandLine();
                }
            };
            this.focusSearch = function() {
                if (consoleWindowExists()) {
                    getConsoleWindow().focusSearch();
                }
            };
            var commandWindow = window;
            this.getCommandWindow = function() {
                return commandWindow;
            };
            this.setCommandWindow = function(commandWindowParam) {
                commandWindow = commandWindowParam;
            };
            this.executeLastCommand = function() {
                if (consoleWindowExists()) {
                    getConsoleWindow().evalLastCommand();
                }
            };
            var commandLayout = new PatternLayout("%m");
            this.getCommandLayout = function() {
                return commandLayout;
            };
            this.setCommandLayout = function(commandLayoutParam) {
                commandLayout = commandLayoutParam;
            };
            this.evalCommandAndAppend = function(expr) {
                var commandReturnValue = {
                    appendResult: true,
                    isError: false
                };
                var commandOutput = "";
                try {
                    var result, i;
                    if (!commandWindow.eval && commandWindow.execScript) {
                        commandWindow.execScript("null");
                    }
                    var commandLineFunctionsHash = {};
                    for (i = 0, len = commandLineFunctions.length; i < len; i++) {
                        commandLineFunctionsHash[commandLineFunctions[i][0]] = commandLineFunctions[i][1];
                    }
                    var objectsToRestore = [];
                    var addObjectToRestore = function(name) {
                        objectsToRestore.push([ name, commandWindow[name] ]);
                    };
                    addObjectToRestore("appender");
                    commandWindow.appender = appender;
                    addObjectToRestore("commandReturnValue");
                    commandWindow.commandReturnValue = commandReturnValue;
                    addObjectToRestore("commandLineFunctionsHash");
                    commandWindow.commandLineFunctionsHash = commandLineFunctionsHash;
                    var addFunctionToWindow = function(name) {
                        addObjectToRestore(name);
                        commandWindow[name] = function() {
                            return this.commandLineFunctionsHash[name](appender, arguments, commandReturnValue);
                        };
                    };
                    for (i = 0, len = commandLineFunctions.length; i < len; i++) {
                        addFunctionToWindow(commandLineFunctions[i][0]);
                    }
                    if (commandWindow === window && commandWindow.execScript) {
                        addObjectToRestore("evalExpr");
                        addObjectToRestore("result");
                        window.evalExpr = expr;
                        commandWindow.execScript("window.result=eval(window.evalExpr);");
                        result = window.result;
                    } else {
                        result = commandWindow.eval(expr);
                    }
                    commandOutput = isUndefined(result) ? result : formatObjectExpansion(result, commandLineObjectExpansionDepth);
                    for (i = 0, len = objectsToRestore.length; i < len; i++) {
                        commandWindow[objectsToRestore[i][0]] = objectsToRestore[i][1];
                    }
                } catch (ex) {
                    commandOutput = "Error evaluating command: " + getExceptionStringRep(ex);
                    commandReturnValue.isError = true;
                }
                if (commandReturnValue.appendResult) {
                    var message = ">>> " + expr;
                    if (!isUndefined(commandOutput)) {
                        message += newLine + commandOutput;
                    }
                    var level = commandReturnValue.isError ? Level.ERROR : Level.INFO;
                    var loggingEvent = new LoggingEvent(null, new Date(), level, [ message ], null);
                    var mainLayout = this.getLayout();
                    this.setLayout(commandLayout);
                    this.append(loggingEvent);
                    this.setLayout(mainLayout);
                }
            };
            var commandLineFunctions = defaultCommandLineFunctions.concat([]);
            this.addCommandLineFunction = function(functionName, commandLineFunction) {
                commandLineFunctions.push([ functionName, commandLineFunction ]);
            };
            var commandHistoryCookieName = "log4javascriptCommandHistory";
            this.storeCommandHistory = function(commandHistory) {
                setCookie(commandHistoryCookieName, commandHistory.join(","));
            };
            var writeHtml = function(doc) {
                var lines = getConsoleHtmlLines();
                doc.open();
                for (var i = 0, len = lines.length; i < len; i++) {
                    doc.writeln(lines[i]);
                }
                doc.close();
            };
            this.setEventTypes([ "load", "unload" ]);
            var consoleWindowLoadHandler = function() {
                var win = getConsoleWindow();
                win.setAppender(appender);
                win.setNewestAtTop(newestMessageAtTop);
                win.setScrollToLatest(scrollToLatestMessage);
                win.setMaxMessages(maxMessages);
                win.setShowCommandLine(showCommandLine);
                win.setShowHideButton(showHideButton);
                win.setShowCloseButton(showCloseButton);
                win.setMainWindow(window);
                var storedValue = getCookie(commandHistoryCookieName);
                if (storedValue) {
                    win.commandHistory = storedValue.split(",");
                    win.currentCommandIndex = win.commandHistory.length;
                }
                appender.dispatchEvent("load", {
                    win: win
                });
            };
            this.unload = function() {
                logLog.debug("unload " + this + ", caller: " + this.unload.caller);
                if (!consoleClosed) {
                    logLog.debug("really doing unload " + this);
                    consoleClosed = true;
                    consoleWindowLoaded = false;
                    consoleWindowCreated = false;
                    appender.dispatchEvent("unload", {});
                }
            };
            var pollConsoleWindow = function(windowTest, interval, successCallback, errorMessage) {
                function doPoll() {
                    try {
                        if (consoleClosed) {
                            clearInterval(poll);
                        }
                        if (windowTest(getConsoleWindow())) {
                            clearInterval(poll);
                            successCallback();
                        }
                    } catch (ex) {
                        clearInterval(poll);
                        isSupported = false;
                        handleError(errorMessage, ex);
                    }
                }
                var poll = setInterval(doPoll, interval);
            };
            var getConsoleUrl = function() {
                var documentDomainSet = document.domain != location.hostname;
                return useDocumentWrite ? "" : getBaseUrl() + "console.html" + (documentDomainSet ? "?log4javascript_domain=" + escape(document.domain) : "");
            };
            if (inPage) {
                var containerElement = null;
                var cssProperties = [];
                this.addCssProperty = function(name, value) {
                    if (checkCanConfigure("cssProperties")) {
                        cssProperties.push([ name, value ]);
                    }
                };
                var windowCreationStarted = false;
                var iframeContainerDiv;
                var iframeId = uniqueId + "_InPageAppender_" + consoleAppenderId;
                this.hide = function() {
                    if (initialized && consoleWindowCreated) {
                        if (consoleWindowExists()) {
                            getConsoleWindow().$("command").blur();
                        }
                        iframeContainerDiv.style.display = "none";
                        minimized = true;
                    }
                };
                this.show = function() {
                    if (initialized) {
                        if (consoleWindowCreated) {
                            iframeContainerDiv.style.display = "block";
                            this.setShowCommandLine(showCommandLine);
                            minimized = false;
                        } else if (!windowCreationStarted) {
                            createWindow(true);
                        }
                    }
                };
                this.isVisible = function() {
                    return !minimized && !consoleClosed;
                };
                this.close = function(fromButton) {
                    if (!consoleClosed && (!fromButton || confirm("This will permanently remove the console from the page. No more messages will be logged. Do you wish to continue?"))) {
                        iframeContainerDiv.parentNode.removeChild(iframeContainerDiv);
                        this.unload();
                    }
                };
                open = function() {
                    var initErrorMessage = "InPageAppender.open: unable to create console iframe";
                    function finalInit() {
                        try {
                            if (!initiallyMinimized) {
                                appender.show();
                            }
                            consoleWindowLoadHandler();
                            consoleWindowLoaded = true;
                            appendQueuedLoggingEvents();
                        } catch (ex) {
                            isSupported = false;
                            handleError(initErrorMessage, ex);
                        }
                    }
                    function writeToDocument() {
                        try {
                            var windowTest = function(win) {
                                return isLoaded(win);
                            };
                            if (useDocumentWrite) {
                                writeHtml(getConsoleWindow().document);
                            }
                            if (windowTest(getConsoleWindow())) {
                                finalInit();
                            } else {
                                pollConsoleWindow(windowTest, 100, finalInit, initErrorMessage);
                            }
                        } catch (ex) {
                            isSupported = false;
                            handleError(initErrorMessage, ex);
                        }
                    }
                    minimized = false;
                    iframeContainerDiv = containerElement.appendChild(document.createElement("div"));
                    iframeContainerDiv.style.width = width;
                    iframeContainerDiv.style.height = height;
                    iframeContainerDiv.style.border = "solid gray 1px";
                    for (var i = 0, len = cssProperties.length; i < len; i++) {
                        iframeContainerDiv.style[cssProperties[i][0]] = cssProperties[i][1];
                    }
                    var iframeSrc = useDocumentWrite ? "" : " src='" + getConsoleUrl() + "'";
                    iframeContainerDiv.innerHTML = "<iframe id='" + iframeId + "' name='" + iframeId + "' width='100%' height='100%' frameborder='0'" + iframeSrc + " scrolling='no'></iframe>";
                    consoleClosed = false;
                    var iframeDocumentExistsTest = function(win) {
                        try {
                            return bool(win) && bool(win.document);
                        } catch (ex) {
                            return false;
                        }
                    };
                    if (iframeDocumentExistsTest(getConsoleWindow())) {
                        writeToDocument();
                    } else {
                        pollConsoleWindow(iframeDocumentExistsTest, 100, writeToDocument, initErrorMessage);
                    }
                    consoleWindowCreated = true;
                };
                createWindow = function(show) {
                    if (show || !initiallyMinimized) {
                        var pageLoadHandler = function() {
                            if (!container) {
                                containerElement = document.createElement("div");
                                containerElement.style.position = "fixed";
                                containerElement.style.left = "0";
                                containerElement.style.right = "0";
                                containerElement.style.bottom = "0";
                                document.body.appendChild(containerElement);
                                appender.addCssProperty("borderWidth", "1px 0 0 0");
                                appender.addCssProperty("zIndex", 1e6);
                                open();
                            } else {
                                try {
                                    var el = document.getElementById(container);
                                    if (el.nodeType == 1) {
                                        containerElement = el;
                                    }
                                    open();
                                } catch (ex) {
                                    handleError("InPageAppender.init: invalid container element '" + container + "' supplied", ex);
                                }
                            }
                        };
                        if (pageLoaded && container && container.appendChild) {
                            containerElement = container;
                            open();
                        } else if (pageLoaded) {
                            pageLoadHandler();
                        } else {
                            log4javascript.addEventListener("load", pageLoadHandler);
                        }
                        windowCreationStarted = true;
                    }
                };
                init = function() {
                    createWindow();
                    initialized = true;
                };
                getConsoleWindow = function() {
                    var iframe = window.frames[iframeId];
                    if (iframe) {
                        return iframe;
                    }
                };
                safeToAppend = function() {
                    if (isSupported && !consoleClosed) {
                        if (consoleWindowCreated && !consoleWindowLoaded && getConsoleWindow() && isLoaded(getConsoleWindow())) {
                            consoleWindowLoaded = true;
                        }
                        return consoleWindowLoaded;
                    }
                    return false;
                };
            } else {
                var useOldPopUp = appender.defaults.useOldPopUp;
                var complainAboutPopUpBlocking = appender.defaults.complainAboutPopUpBlocking;
                var reopenWhenClosed = this.defaults.reopenWhenClosed;
                this.isUseOldPopUp = function() {
                    return useOldPopUp;
                };
                this.setUseOldPopUp = function(useOldPopUpParam) {
                    if (checkCanConfigure("useOldPopUp")) {
                        useOldPopUp = bool(useOldPopUpParam);
                    }
                };
                this.isComplainAboutPopUpBlocking = function() {
                    return complainAboutPopUpBlocking;
                };
                this.setComplainAboutPopUpBlocking = function(complainAboutPopUpBlockingParam) {
                    if (checkCanConfigure("complainAboutPopUpBlocking")) {
                        complainAboutPopUpBlocking = bool(complainAboutPopUpBlockingParam);
                    }
                };
                this.isFocusPopUp = function() {
                    return focusConsoleWindow;
                };
                this.setFocusPopUp = function(focusPopUpParam) {
                    focusConsoleWindow = bool(focusPopUpParam);
                };
                this.isReopenWhenClosed = function() {
                    return reopenWhenClosed;
                };
                this.setReopenWhenClosed = function(reopenWhenClosedParam) {
                    reopenWhenClosed = bool(reopenWhenClosedParam);
                };
                this.close = function() {
                    logLog.debug("close " + this);
                    try {
                        popUp.close();
                        this.unload();
                    } catch (ex) {}
                };
                this.hide = function() {
                    logLog.debug("hide " + this);
                    if (consoleWindowExists()) {
                        this.close();
                    }
                };
                this.show = function() {
                    logLog.debug("show " + this);
                    if (!consoleWindowCreated) {
                        open();
                    }
                };
                this.isVisible = function() {
                    return safeToAppend();
                };
                var popUp;
                open = function() {
                    var windowProperties = "width=" + width + ",height=" + height + ",status,resizable";
                    var frameInfo = "";
                    try {
                        var frameEl = window.frameElement;
                        if (frameEl) {
                            frameInfo = "_" + frameEl.tagName + "_" + (frameEl.name || frameEl.id || "");
                        }
                    } catch (e) {
                        frameInfo = "_inaccessibleParentFrame";
                    }
                    var windowName = "PopUp_" + location.host.replace(/[^a-z0-9]/gi, "_") + "_" + consoleAppenderId + frameInfo;
                    if (!useOldPopUp || !useDocumentWrite) {
                        windowName = windowName + "_" + uniqueId;
                    }
                    var checkPopUpClosed = function(win) {
                        if (consoleClosed) {
                            return true;
                        } else {
                            try {
                                return bool(win) && win.closed;
                            } catch (ex) {}
                        }
                        return false;
                    };
                    var popUpClosedCallback = function() {
                        if (!consoleClosed) {
                            appender.unload();
                        }
                    };
                    function finalInit() {
                        getConsoleWindow().setCloseIfOpenerCloses(!useOldPopUp || !useDocumentWrite);
                        consoleWindowLoadHandler();
                        consoleWindowLoaded = true;
                        appendQueuedLoggingEvents();
                        pollConsoleWindow(checkPopUpClosed, 500, popUpClosedCallback, "PopUpAppender.checkPopUpClosed: error checking pop-up window");
                    }
                    try {
                        popUp = window.open(getConsoleUrl(), windowName, windowProperties);
                        consoleClosed = false;
                        consoleWindowCreated = true;
                        if (popUp && popUp.document) {
                            if (useDocumentWrite && useOldPopUp && isLoaded(popUp)) {
                                popUp.mainPageReloaded();
                                finalInit();
                            } else {
                                if (useDocumentWrite) {
                                    writeHtml(popUp.document);
                                }
                                var popUpLoadedTest = function(win) {
                                    return bool(win) && isLoaded(win);
                                };
                                if (isLoaded(popUp)) {
                                    finalInit();
                                } else {
                                    pollConsoleWindow(popUpLoadedTest, 100, finalInit, "PopUpAppender.init: unable to create console window");
                                }
                            }
                        } else {
                            isSupported = false;
                            logLog.warn("PopUpAppender.init: pop-ups blocked, please unblock to use PopUpAppender");
                            if (complainAboutPopUpBlocking) {
                                handleError("log4javascript: pop-up windows appear to be blocked. Please unblock them to use pop-up logging.");
                            }
                        }
                    } catch (ex) {
                        handleError("PopUpAppender.init: error creating pop-up", ex);
                    }
                };
                createWindow = function() {
                    if (!initiallyMinimized) {
                        open();
                    }
                };
                init = function() {
                    createWindow();
                    initialized = true;
                };
                getConsoleWindow = function() {
                    return popUp;
                };
                safeToAppend = function() {
                    if (isSupported && !isUndefined(popUp) && !consoleClosed) {
                        if (popUp.closed || consoleWindowLoaded && isUndefined(popUp.closed)) {
                            appender.unload();
                            logLog.debug("PopUpAppender: pop-up closed");
                            return false;
                        }
                        if (!consoleWindowLoaded && isLoaded(popUp)) {
                            consoleWindowLoaded = true;
                        }
                    }
                    return isSupported && consoleWindowLoaded && !consoleClosed;
                };
            }
            this.getConsoleWindow = getConsoleWindow;
        };
        ConsoleAppender.addGlobalCommandLineFunction = function(functionName, commandLineFunction) {
            defaultCommandLineFunctions.push([ functionName, commandLineFunction ]);
        };
        function PopUpAppender(lazyInit, initiallyMinimized, useDocumentWrite, width, height) {
            this.create(false, null, lazyInit, initiallyMinimized, useDocumentWrite, width, height, this.defaults.focusPopUp);
        }
        PopUpAppender.prototype = new ConsoleAppender();
        PopUpAppender.prototype.defaults = {
            layout: new PatternLayout("%d{HH:mm:ss} %-5p - %m{1}%n"),
            initiallyMinimized: false,
            focusPopUp: false,
            lazyInit: true,
            useOldPopUp: true,
            complainAboutPopUpBlocking: true,
            newestMessageAtTop: false,
            scrollToLatestMessage: true,
            width: "600",
            height: "400",
            reopenWhenClosed: false,
            maxMessages: null,
            showCommandLine: true,
            commandLineObjectExpansionDepth: 1,
            showHideButton: false,
            showCloseButton: true,
            showLogEntryDeleteButtons: true,
            useDocumentWrite: true
        };
        PopUpAppender.prototype.toString = function() {
            return "PopUpAppender";
        };
        log4javascript.PopUpAppender = PopUpAppender;
        function InPageAppender(container, lazyInit, initiallyMinimized, useDocumentWrite, width, height) {
            this.create(true, container, lazyInit, initiallyMinimized, useDocumentWrite, width, height, false);
        }
        InPageAppender.prototype = new ConsoleAppender();
        InPageAppender.prototype.defaults = {
            layout: new PatternLayout("%d{HH:mm:ss} %-5p - %m{1}%n"),
            initiallyMinimized: false,
            lazyInit: true,
            newestMessageAtTop: false,
            scrollToLatestMessage: true,
            width: "100%",
            height: "220px",
            maxMessages: null,
            showCommandLine: true,
            commandLineObjectExpansionDepth: 1,
            showHideButton: false,
            showCloseButton: false,
            showLogEntryDeleteButtons: true,
            useDocumentWrite: true
        };
        InPageAppender.prototype.toString = function() {
            return "InPageAppender";
        };
        log4javascript.InPageAppender = InPageAppender;
        log4javascript.InlineAppender = InPageAppender;
    })();
    function padWithSpaces(str, len) {
        if (str.length < len) {
            var spaces = [];
            var numberOfSpaces = Math.max(0, len - str.length);
            for (var i = 0; i < numberOfSpaces; i++) {
                spaces[i] = " ";
            }
            str += spaces.join("");
        }
        return str;
    }
    (function() {
        function dir(obj) {
            var maxLen = 0;
            for (var p in obj) {
                maxLen = Math.max(toStr(p).length, maxLen);
            }
            var propList = [];
            for (p in obj) {
                var propNameStr = "  " + padWithSpaces(toStr(p), maxLen + 2);
                var propVal;
                try {
                    propVal = splitIntoLines(toStr(obj[p])).join(padWithSpaces(newLine, maxLen + 6));
                } catch (ex) {
                    propVal = "[Error obtaining property. Details: " + getExceptionMessage(ex) + "]";
                }
                propList.push(propNameStr + propVal);
            }
            return propList.join(newLine);
        }
        var nodeTypes = {
            ELEMENT_NODE: 1,
            ATTRIBUTE_NODE: 2,
            TEXT_NODE: 3,
            CDATA_SECTION_NODE: 4,
            ENTITY_REFERENCE_NODE: 5,
            ENTITY_NODE: 6,
            PROCESSING_INSTRUCTION_NODE: 7,
            COMMENT_NODE: 8,
            DOCUMENT_NODE: 9,
            DOCUMENT_TYPE_NODE: 10,
            DOCUMENT_FRAGMENT_NODE: 11,
            NOTATION_NODE: 12
        };
        var preFormattedElements = [ "script", "pre" ];
        var emptyElements = [ "br", "img", "hr", "param", "link", "area", "input", "col", "base", "meta" ];
        var indentationUnit = "  ";
        function getXhtml(rootNode, includeRootNode, indentation, startNewLine, preformatted) {
            includeRootNode = typeof includeRootNode == "undefined" ? true : !!includeRootNode;
            if (typeof indentation != "string") {
                indentation = "";
            }
            startNewLine = !!startNewLine;
            preformatted = !!preformatted;
            var xhtml;
            function isWhitespace(node) {
                return node.nodeType == nodeTypes.TEXT_NODE && /^[ \t\r\n]*$/.test(node.nodeValue);
            }
            function fixAttributeValue(attrValue) {
                return attrValue.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
            }
            function getStyleAttributeValue(el) {
                var stylePairs = el.style.cssText.split(";");
                var styleValue = "";
                var isFirst = true;
                for (var j = 0, len = stylePairs.length; j < len; j++) {
                    var nameValueBits = stylePairs[j].split(":");
                    var props = [];
                    if (!/^\s*$/.test(nameValueBits[0])) {
                        props.push(trim(nameValueBits[0]).toLowerCase() + ":" + trim(nameValueBits[1]));
                    }
                    styleValue = props.join(";");
                }
                return styleValue;
            }
            function getNamespace(el) {
                if (el.prefix) {
                    return el.prefix;
                } else if (el.outerHTML) {
                    var regex = new RegExp("<([^:]+):" + el.tagName + "[^>]*>", "i");
                    if (regex.test(el.outerHTML)) {
                        return RegExp.$1.toLowerCase();
                    }
                }
                return "";
            }
            var lt = "<";
            var gt = ">";
            if (includeRootNode && rootNode.nodeType != nodeTypes.DOCUMENT_FRAGMENT_NODE) {
                switch (rootNode.nodeType) {
                  case nodeTypes.ELEMENT_NODE:
                    var tagName = rootNode.tagName.toLowerCase();
                    xhtml = startNewLine ? newLine + indentation : "";
                    xhtml += lt;
                    var prefix = getNamespace(rootNode);
                    var hasPrefix = !!prefix;
                    if (hasPrefix) {
                        xhtml += prefix + ":";
                    }
                    xhtml += tagName;
                    for (i = 0, len = rootNode.attributes.length; i < len; i++) {
                        var currentAttr = rootNode.attributes[i];
                        if (!currentAttr.specified || currentAttr.nodeValue === null || currentAttr.nodeName.toLowerCase() === "style" || typeof currentAttr.nodeValue !== "string" || currentAttr.nodeName.indexOf("_moz") === 0) {
                            continue;
                        }
                        xhtml += " " + currentAttr.nodeName.toLowerCase() + '="';
                        xhtml += fixAttributeValue(currentAttr.nodeValue);
                        xhtml += '"';
                    }
                    if (rootNode.style.cssText) {
                        var styleValue = getStyleAttributeValue(rootNode);
                        if (styleValue !== "") {
                            xhtml += ' style="' + getStyleAttributeValue(rootNode) + '"';
                        }
                    }
                    if (array_contains(emptyElements, tagName) || hasPrefix && !rootNode.hasChildNodes()) {
                        xhtml += "/" + gt;
                    } else {
                        xhtml += gt;
                        var childStartNewLine = !(rootNode.childNodes.length === 1 && rootNode.childNodes[0].nodeType === nodeTypes.TEXT_NODE);
                        var childPreformatted = array_contains(preFormattedElements, tagName);
                        for (var i = 0, len = rootNode.childNodes.length; i < len; i++) {
                            xhtml += getXhtml(rootNode.childNodes[i], true, indentation + indentationUnit, childStartNewLine, childPreformatted);
                        }
                        var endTag = lt + "/" + tagName + gt;
                        xhtml += childStartNewLine ? newLine + indentation + endTag : endTag;
                    }
                    return xhtml;

                  case nodeTypes.TEXT_NODE:
                    if (isWhitespace(rootNode)) {
                        xhtml = "";
                    } else {
                        if (preformatted) {
                            xhtml = rootNode.nodeValue;
                        } else {
                            var lines = splitIntoLines(trim(rootNode.nodeValue));
                            var trimmedLines = [];
                            for (var i = 0, len = lines.length; i < len; i++) {
                                trimmedLines[i] = trim(lines[i]);
                            }
                            xhtml = trimmedLines.join(newLine + indentation);
                        }
                        if (startNewLine) {
                            xhtml = newLine + indentation + xhtml;
                        }
                    }
                    return xhtml;

                  case nodeTypes.CDATA_SECTION_NODE:
                    return "<![CDA" + "TA[" + rootNode.nodeValue + "]" + "]>" + newLine;

                  case nodeTypes.DOCUMENT_NODE:
                    xhtml = "";
                    for (var i = 0, len = rootNode.childNodes.length; i < len; i++) {
                        xhtml += getXhtml(rootNode.childNodes[i], true, indentation);
                    }
                    return xhtml;

                  default:
                    return "";
                }
            } else {
                xhtml = "";
                for (var i = 0, len = rootNode.childNodes.length; i < len; i++) {
                    xhtml += getXhtml(rootNode.childNodes[i], true, indentation + indentationUnit);
                }
                return xhtml;
            }
        }
        function createCommandLineFunctions() {
            ConsoleAppender.addGlobalCommandLineFunction("$", function(appender, args, returnValue) {
                return document.getElementById(args[0]);
            });
            ConsoleAppender.addGlobalCommandLineFunction("dir", function(appender, args, returnValue) {
                var lines = [];
                for (var i = 0, len = args.length; i < len; i++) {
                    lines[i] = dir(args[i]);
                }
                return lines.join(newLine + newLine);
            });
            ConsoleAppender.addGlobalCommandLineFunction("dirxml", function(appender, args, returnValue) {
                var lines = [];
                for (var i = 0, len = args.length; i < len; i++) {
                    var win = appender.getCommandWindow();
                    lines[i] = getXhtml(args[i]);
                }
                return lines.join(newLine + newLine);
            });
            ConsoleAppender.addGlobalCommandLineFunction("cd", function(appender, args, returnValue) {
                var win, message;
                if (args.length === 0 || args[0] === "") {
                    win = window;
                    message = "Command line set to run in main window";
                } else {
                    if (args[0].window == args[0]) {
                        win = args[0];
                        message = "Command line set to run in frame '" + args[0].name + "'";
                    } else {
                        win = window.frames[args[0]];
                        if (win) {
                            message = "Command line set to run in frame '" + args[0] + "'";
                        } else {
                            returnValue.isError = true;
                            message = "Frame '" + args[0] + "' does not exist";
                            win = appender.getCommandWindow();
                        }
                    }
                }
                appender.setCommandWindow(win);
                return message;
            });
            ConsoleAppender.addGlobalCommandLineFunction("clear", function(appender, args, returnValue) {
                returnValue.appendResult = false;
                appender.clear();
            });
            ConsoleAppender.addGlobalCommandLineFunction("keys", function(appender, args, returnValue) {
                var keys = [];
                for (var k in args[0]) {
                    keys.push(k);
                }
                return keys;
            });
            ConsoleAppender.addGlobalCommandLineFunction("values", function(appender, args, returnValue) {
                var values = [];
                for (var k in args[0]) {
                    try {
                        values.push(args[0][k]);
                    } catch (ex) {
                        logLog.warn("values(): Unable to obtain value for key " + k + ". Details: " + getExceptionMessage(ex));
                    }
                }
                return values;
            });
            ConsoleAppender.addGlobalCommandLineFunction("expansionDepth", function(appender, args, returnValue) {
                var expansionDepth = parseInt(args[0], 10);
                if (isNaN(expansionDepth) || expansionDepth < 0) {
                    returnValue.isError = true;
                    return "" + args[0] + " is not a valid expansion depth";
                } else {
                    appender.setCommandLineObjectExpansionDepth(expansionDepth);
                    return "Object expansion depth set to " + expansionDepth;
                }
            });
        }
        function init() {
            createCommandLineFunctions();
        }
        init();
    })();
    log4javascript.setDocumentReady = function() {
        pageLoaded = true;
        log4javascript.dispatchEvent("load", {});
    };
    if (window.addEventListener) {
        window.addEventListener("load", log4javascript.setDocumentReady, false);
    } else if (window.attachEvent) {
        window.attachEvent("onload", log4javascript.setDocumentReady);
    } else {
        var oldOnload = window.onload;
        if (typeof window.onload != "function") {
            window.onload = log4javascript.setDocumentReady;
        } else {
            window.onload = function(evt) {
                if (oldOnload) {
                    oldOnload(evt);
                }
                log4javascript.setDocumentReady();
            };
        }
    }
    window.log4javascript = log4javascript;
    return log4javascript;
}();

(function(definition) {
    Q = definition();
})(function() {
    "use strict";
    var qStartingLine = captureLine();
    var qFileName;
    var noop = function() {};
    var nextTick;
    if (typeof process !== "undefined") {
        nextTick = process.nextTick;
    } else if (typeof setImmediate === "function") {
        if (typeof window !== "undefined") {
            nextTick = setImmediate.bind(window);
        } else {
            nextTick = setImmediate;
        }
    } else {
        (function() {
            var head = {
                task: void 0,
                next: null
            }, tail = head, maxPendingTicks = 2, pendingTicks = 0, queuedTasks = 0, usedTicks = 0, requestTick;
            function onTick() {
                --pendingTicks;
                if (++usedTicks >= maxPendingTicks) {
                    usedTicks = 0;
                    maxPendingTicks *= 4;
                    var expectedTicks = queuedTasks && Math.min(queuedTasks - 1, maxPendingTicks);
                    while (pendingTicks < expectedTicks) {
                        ++pendingTicks;
                        requestTick();
                    }
                }
                while (queuedTasks) {
                    --queuedTasks;
                    head = head.next;
                    var task = head.task;
                    head.task = void 0;
                    task();
                }
                usedTicks = 0;
            }
            nextTick = function(task) {
                tail = tail.next = {
                    task: task,
                    next: null
                };
                if (pendingTicks < ++queuedTasks && pendingTicks < maxPendingTicks) {
                    ++pendingTicks;
                    requestTick();
                }
            };
            if (typeof MessageChannel !== "undefined") {
                var channel = new MessageChannel();
                channel.port1.onmessage = onTick;
                requestTick = function() {
                    channel.port2.postMessage(0);
                };
            } else {
                requestTick = function() {
                    setTimeout(onTick, 0);
                };
            }
        })();
    }
    function uncurryThis(f) {
        var call = Function.call;
        return function() {
            return call.apply(f, arguments);
        };
    }
    var array_slice = uncurryThis(Array.prototype.slice);
    var array_reduce = uncurryThis(Array.prototype.reduce || function(callback, basis) {
        var index = 0, length = this.length;
        if (arguments.length === 1) {
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        for (;index < length; index++) {
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    });
    var array_indexOf = uncurryThis(Array.prototype.indexOf || function(value) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    });
    var array_map = uncurryThis(Array.prototype.map || function(callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function(undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    });
    var object_create = Object.create || function(prototype) {
        function Type() {}
        Type.prototype = prototype;
        return new Type();
    };
    var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
    var object_keys = Object.keys || function(object) {
        var keys = [];
        for (var key in object) {
            if (object_hasOwnProperty(object, key)) {
                keys.push(key);
            }
        }
        return keys;
    };
    var object_toString = uncurryThis(Object.prototype.toString);
    function isStopIteration(exception) {
        return object_toString(exception) === "[object StopIteration]" || exception instanceof QReturnValue;
    }
    var QReturnValue;
    if (typeof ReturnValue !== "undefined") {
        QReturnValue = ReturnValue;
    } else {
        QReturnValue = function(value) {
            this.value = value;
        };
    }
    Q.longStackJumpLimit = 1;
    var STACK_JUMP_SEPARATOR = "From previous event:";
    function makeStackTraceLong(error, promise) {
        if (promise.stack && typeof error === "object" && error !== null && error.stack && error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1) {
            error.stack = filterStackString(error.stack) + "\n" + STACK_JUMP_SEPARATOR + "\n" + filterStackString(promise.stack);
        }
    }
    function filterStackString(stackString) {
        var lines = stackString.split("\n");
        var desiredLines = [];
        for (var i = 0; i < lines.length; ++i) {
            var line = lines[i];
            if (!isInternalFrame(line) && !isNodeFrame(line)) {
                desiredLines.push(line);
            }
        }
        return desiredLines.join("\n");
    }
    function isNodeFrame(stackLine) {
        return stackLine.indexOf("(module.js:") !== -1 || stackLine.indexOf("(node.js:") !== -1;
    }
    function isInternalFrame(stackLine) {
        var pieces = /at .+ \((.*):(\d+):\d+\)/.exec(stackLine);
        if (!pieces) {
            return false;
        }
        var fileName = pieces[1];
        var lineNumber = pieces[2];
        return fileName === qFileName && lineNumber >= qStartingLine && lineNumber <= qEndingLine;
    }
    function captureLine() {
        if (Error.captureStackTrace) {
            var fileName, lineNumber;
            var oldPrepareStackTrace = Error.prepareStackTrace;
            Error.prepareStackTrace = function(error, frames) {
                fileName = frames[1].getFileName();
                lineNumber = frames[1].getLineNumber();
            };
            new Error().stack;
            Error.prepareStackTrace = oldPrepareStackTrace;
            qFileName = fileName;
            return lineNumber;
        }
    }
    function deprecate(callback, name, alternative) {
        return function() {
            if (typeof console !== "undefined" && typeof console.warn === "function") {
                console.warn(name + " is deprecated, use " + alternative + " instead.", new Error("").stack);
            }
            return callback.apply(callback, arguments);
        };
    }
    function Q(value) {
        return resolve(value);
    }
    Q.nextTick = nextTick;
    Q.defer = defer;
    function defer() {
        var pending = [], progressListeners = [], value;
        var deferred = object_create(defer.prototype);
        var promise = object_create(makePromise.prototype);
        promise.promiseDispatch = function(resolve, op, operands) {
            var args = array_slice(arguments);
            if (pending) {
                pending.push(args);
                if (op === "when" && operands[1]) {
                    progressListeners.push(operands[1]);
                }
            } else {
                nextTick(function() {
                    value.promiseDispatch.apply(value, args);
                });
            }
        };
        promise.valueOf = function() {
            if (pending) {
                return promise;
            }
            value = valueOf(value);
            return value;
        };
        if (Error.captureStackTrace && Q.longStackJumpLimit > 0) {
            Error.captureStackTrace(promise, defer);
            promise.stack = promise.stack.substring(promise.stack.indexOf("\n") + 1);
        }
        function become(resolvedValue) {
            if (!pending) {
                return;
            }
            value = resolve(resolvedValue);
            array_reduce(pending, function(undefined, pending) {
                nextTick(function() {
                    value.promiseDispatch.apply(value, pending);
                });
            }, void 0);
            pending = void 0;
            progressListeners = void 0;
        }
        deferred.promise = promise;
        deferred.resolve = become;
        deferred.fulfill = function(value) {
            become(fulfill(value));
        };
        deferred.reject = function(exception) {
            become(reject(exception));
        };
        deferred.notify = function(progress) {
            if (pending) {
                array_reduce(progressListeners, function(undefined, progressListener) {
                    nextTick(function() {
                        progressListener(progress);
                    });
                }, void 0);
            }
        };
        return deferred;
    }
    defer.prototype.makeNodeResolver = function() {
        var self = this;
        return function(error, value) {
            if (error) {
                self.reject(error);
            } else if (arguments.length > 2) {
                self.resolve(array_slice(arguments, 1));
            } else {
                self.resolve(value);
            }
        };
    };
    Q.promise = promise;
    function promise(makePromise) {
        var deferred = defer();
        fcall(makePromise, deferred.resolve, deferred.reject, deferred.notify).fail(deferred.reject);
        return deferred.promise;
    }
    Q.makePromise = makePromise;
    function makePromise(descriptor, fallback, valueOf, exception, isException) {
        if (fallback === void 0) {
            fallback = function(op) {
                return reject(new Error("Promise does not support operation: " + op));
            };
        }
        var promise = object_create(makePromise.prototype);
        promise.promiseDispatch = function(resolve, op, args) {
            var result;
            try {
                if (descriptor[op]) {
                    result = descriptor[op].apply(promise, args);
                } else {
                    result = fallback.call(promise, op, args);
                }
            } catch (exception) {
                result = reject(exception);
            }
            if (resolve) {
                resolve(result);
            }
        };
        if (valueOf) {
            promise.valueOf = valueOf;
        }
        if (isException) {
            promise.exception = exception;
        }
        return promise;
    }
    makePromise.prototype.then = function(fulfilled, rejected, progressed) {
        return when(this, fulfilled, rejected, progressed);
    };
    makePromise.prototype.thenResolve = function(value) {
        return when(this, function() {
            return value;
        });
    };
    array_reduce([ "isFulfilled", "isRejected", "isPending", "dispatch", "when", "spread", "get", "put", "set", "del", "delete", "post", "send", "invoke", "keys", "fapply", "fcall", "fbind", "all", "allResolved", "timeout", "delay", "catch", "finally", "fail", "fin", "progress", "done", "nfcall", "nfapply", "nfbind", "denodeify", "nbind", "ncall", "napply", "nbind", "npost", "nsend", "ninvoke", "nodeify" ], function(undefined, name) {
        makePromise.prototype[name] = function() {
            return Q[name].apply(Q, [ this ].concat(array_slice(arguments)));
        };
    }, void 0);
    makePromise.prototype.toSource = function() {
        return this.toString();
    };
    makePromise.prototype.toString = function() {
        return "[object Promise]";
    };
    Q.nearer = valueOf;
    function valueOf(value) {
        if (isPromise(value)) {
            return value.valueOf();
        }
        return value;
    }
    Q.isPromise = isPromise;
    function isPromise(object) {
        return object && typeof object.promiseDispatch === "function";
    }
    Q.isPromiseAlike = isPromiseAlike;
    function isPromiseAlike(object) {
        return object && typeof object.then === "function";
    }
    Q.isPending = isPending;
    function isPending(object) {
        return !isFulfilled(object) && !isRejected(object);
    }
    Q.isFulfilled = isFulfilled;
    function isFulfilled(object) {
        return !isPromiseAlike(valueOf(object));
    }
    Q.isRejected = isRejected;
    function isRejected(object) {
        object = valueOf(object);
        return isPromise(object) && "exception" in object;
    }
    var rejections = [];
    var errors = [];
    var errorsDisplayed;
    function displayErrors() {
        if (!errorsDisplayed && typeof window !== "undefined" && window.console) {
            console.error("Should be empty:", errors);
        }
    }
    if (typeof process !== "undefined" && process.on) {
        process.on("exit", function() {
            for (var i = 0; i < errors.length; i++) {
                var error = errors[i];
                if (error && typeof error.stack !== "undefined") {
                    console.warn("Unhandled rejected promise:", error.stack);
                } else {
                    console.warn("Unhandled rejected promise (no stack):", error);
                }
            }
        });
    }
    Q.reject = reject;
    function reject(exception) {
        var rejection = makePromise({
            when: function(rejected) {
                if (rejected) {
                    var at = array_indexOf(rejections, this);
                    if (at !== -1) {
                        errors.splice(at, 1);
                        rejections.splice(at, 1);
                    }
                }
                return rejected ? rejected(exception) : this;
            }
        }, function fallback() {
            return reject(exception);
        }, function valueOf() {
            return this;
        }, exception, true);
        rejections.push(rejection);
        errors.push(exception);
        return rejection;
    }
    Q.fulfill = fulfill;
    function fulfill(object) {
        return makePromise({
            when: function() {
                return object;
            },
            get: function(name) {
                return object[name];
            },
            set: function(name, value) {
                object[name] = value;
            },
            "delete": function(name) {
                delete object[name];
            },
            post: function(name, args) {
                if (name == null) {
                    return object.apply(void 0, args);
                } else {
                    return object[name].apply(object, args);
                }
            },
            apply: function(thisP, args) {
                return object.apply(thisP, args);
            },
            keys: function() {
                return object_keys(object);
            }
        }, void 0, function valueOf() {
            return object;
        });
    }
    Q.resolve = resolve;
    function resolve(value) {
        if (isPromise(value)) {
            return value;
        }
        value = valueOf(value);
        if (isPromiseAlike(value)) {
            return coerce(value);
        } else {
            return fulfill(value);
        }
    }
    function coerce(promise) {
        var deferred = defer();
        nextTick(function() {
            try {
                promise.then(deferred.resolve, deferred.reject, deferred.notify);
            } catch (exception) {
                deferred.reject(exception);
            }
        });
        return deferred.promise;
    }
    Q.master = master;
    function master(object) {
        return makePromise({
            isDef: function() {}
        }, function fallback(op, args) {
            return dispatch(object, op, args);
        }, function() {
            return valueOf(object);
        });
    }
    Q.when = when;
    function when(value, fulfilled, rejected, progressed) {
        var deferred = defer();
        var done = false;
        function _fulfilled(value) {
            try {
                return typeof fulfilled === "function" ? fulfilled(value) : value;
            } catch (exception) {
                return reject(exception);
            }
        }
        function _rejected(exception) {
            if (typeof rejected === "function") {
                makeStackTraceLong(exception, resolvedValue);
                try {
                    return rejected(exception);
                } catch (newException) {
                    return reject(newException);
                }
            }
            return reject(exception);
        }
        function _progressed(value) {
            return typeof progressed === "function" ? progressed(value) : value;
        }
        var resolvedValue = resolve(value);
        nextTick(function() {
            resolvedValue.promiseDispatch(function(value) {
                if (done) {
                    return;
                }
                done = true;
                deferred.resolve(_fulfilled(value));
            }, "when", [ function(exception) {
                if (done) {
                    return;
                }
                done = true;
                deferred.resolve(_rejected(exception));
            } ]);
        });
        resolvedValue.promiseDispatch(void 0, "when", [ void 0, function(value) {
            var newValue;
            var threw = false;
            try {
                newValue = _progressed(value);
            } catch (e) {
                threw = true;
                if (Q.onerror) {
                    Q.onerror(e);
                } else {
                    throw e;
                }
            }
            if (!threw) {
                deferred.notify(newValue);
            }
        } ]);
        return deferred.promise;
    }
    Q.spread = spread;
    function spread(promise, fulfilled, rejected) {
        return when(promise, function(valuesOrPromises) {
            return all(valuesOrPromises).then(function(values) {
                return fulfilled.apply(void 0, values);
            }, rejected);
        }, rejected);
    }
    Q.async = async;
    function async(makeGenerator) {
        return function() {
            function continuer(verb, arg) {
                var result;
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return exception.value;
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
            var generator = makeGenerator.apply(this, arguments);
            var callback = continuer.bind(continuer, "send");
            var errback = continuer.bind(continuer, "throw");
            return callback();
        };
    }
    Q["return"] = _return;
    function _return(value) {
        throw new QReturnValue(value);
    }
    Q.promised = promised;
    function promised(callback) {
        return function() {
            return spread([ this, all(arguments) ], function(self, args) {
                return callback.apply(self, args);
            });
        };
    }
    Q.dispatch = dispatch;
    function dispatch(object, op, args) {
        var deferred = defer();
        nextTick(function() {
            resolve(object).promiseDispatch(deferred.resolve, op, args);
        });
        return deferred.promise;
    }
    Q.dispatcher = dispatcher;
    function dispatcher(op) {
        return function(object) {
            var args = array_slice(arguments, 1);
            return dispatch(object, op, args);
        };
    }
    Q.get = dispatcher("get");
    Q.set = dispatcher("set");
    Q["delete"] = Q.del = dispatcher("delete");
    var post = Q.post = dispatcher("post");
    Q.send = send;
    Q.invoke = send;
    function send(value, name) {
        var args = array_slice(arguments, 2);
        return post(value, name, args);
    }
    Q.fapply = fapply;
    function fapply(value, args) {
        return dispatch(value, "apply", [ void 0, args ]);
    }
    Q["try"] = fcall;
    Q.fcall = fcall;
    function fcall(value) {
        var args = array_slice(arguments, 1);
        return fapply(value, args);
    }
    Q.fbind = fbind;
    function fbind(value) {
        var args = array_slice(arguments, 1);
        return function fbound() {
            var allArgs = args.concat(array_slice(arguments));
            return dispatch(value, "apply", [ this, allArgs ]);
        };
    }
    Q.keys = dispatcher("keys");
    Q.all = all;
    function all(promises) {
        return when(promises, function(promises) {
            var countDown = promises.length;
            if (countDown === 0) {
                return resolve(promises);
            }
            var deferred = defer();
            array_reduce(promises, function(undefined, promise, index) {
                if (isFulfilled(promise)) {
                    promises[index] = valueOf(promise);
                    if (--countDown === 0) {
                        deferred.resolve(promises);
                    }
                } else {
                    when(promise, function(value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    }).fail(deferred.reject);
                }
            }, void 0);
            return deferred.promise;
        });
    }
    Q.allResolved = allResolved;
    function allResolved(promises) {
        return when(promises, function(promises) {
            promises = array_map(promises, resolve);
            return when(all(array_map(promises, function(promise) {
                return when(promise, noop, noop);
            })), function() {
                return promises;
            });
        });
    }
    Q["catch"] = Q.fail = fail;
    function fail(promise, rejected) {
        return when(promise, void 0, rejected);
    }
    Q.progress = progress;
    function progress(promise, progressed) {
        return when(promise, void 0, void 0, progressed);
    }
    Q["finally"] = Q.fin = fin;
    function fin(promise, callback) {
        return when(promise, function(value) {
            return when(callback(), function() {
                return value;
            });
        }, function(exception) {
            return when(callback(), function() {
                return reject(exception);
            });
        });
    }
    Q.done = done;
    function done(promise, fulfilled, rejected, progress) {
        var onUnhandledError = function(error) {
            nextTick(function() {
                makeStackTraceLong(error, promise);
                if (Q.onerror) {
                    Q.onerror(error);
                } else {
                    throw error;
                }
            });
        };
        var promiseToHandle = fulfilled || rejected || progress ? when(promise, fulfilled, rejected, progress) : promise;
        if (typeof process === "object" && process && process.domain) {
            onUnhandledError = process.domain.bind(onUnhandledError);
        }
        fail(promiseToHandle, onUnhandledError);
    }
    Q.timeout = timeout;
    function timeout(promise, ms) {
        var deferred = defer();
        var timeoutId = setTimeout(function() {
            deferred.reject(new Error("Timed out after " + ms + " ms"));
        }, ms);
        when(promise, function(value) {
            clearTimeout(timeoutId);
            deferred.resolve(value);
        }, function(exception) {
            clearTimeout(timeoutId);
            deferred.reject(exception);
        });
        return deferred.promise;
    }
    Q.delay = delay;
    function delay(promise, timeout) {
        if (timeout === void 0) {
            timeout = promise;
            promise = void 0;
        }
        var deferred = defer();
        setTimeout(function() {
            deferred.resolve(promise);
        }, timeout);
        return deferred.promise;
    }
    Q.nfapply = nfapply;
    function nfapply(callback, args) {
        var nodeArgs = array_slice(args);
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        fapply(callback, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    }
    Q.nfcall = nfcall;
    function nfcall(callback) {
        var nodeArgs = array_slice(arguments, 1);
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        fapply(callback, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    }
    Q.nfbind = nfbind;
    Q.denodeify = Q.nfbind;
    function nfbind(callback) {
        var baseArgs = array_slice(arguments, 1);
        return function() {
            var nodeArgs = baseArgs.concat(array_slice(arguments));
            var deferred = defer();
            nodeArgs.push(deferred.makeNodeResolver());
            fapply(callback, nodeArgs).fail(deferred.reject);
            return deferred.promise;
        };
    }
    Q.nbind = nbind;
    function nbind(callback) {
        var baseArgs = array_slice(arguments, 1);
        return function() {
            var nodeArgs = baseArgs.concat(array_slice(arguments));
            var deferred = defer();
            nodeArgs.push(deferred.makeNodeResolver());
            var thisArg = this;
            function bound() {
                return callback.apply(thisArg, arguments);
            }
            fapply(bound, nodeArgs).fail(deferred.reject);
            return deferred.promise;
        };
    }
    Q.npost = npost;
    function npost(object, name, args) {
        var nodeArgs = array_slice(args || []);
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        post(object, name, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    }
    Q.nsend = nsend;
    Q.ninvoke = Q.nsend;
    function nsend(object, name) {
        var nodeArgs = array_slice(arguments, 2);
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        post(object, name, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    }
    Q.nodeify = nodeify;
    function nodeify(promise, nodeback) {
        if (nodeback) {
            promise.then(function(value) {
                nextTick(function() {
                    nodeback(null, value);
                });
            }, function(error) {
                nextTick(function() {
                    nodeback(error);
                });
            });
        } else {
            return promise;
        }
    }
    var qEndingLine = captureLine();
    return Q;
});

var mp4lib = function() {
    var mp4lib = {
        boxes: {},
        fields: {},
        debug: false,
        warningHandler: function(message) {}
    };
    var boxTypeArray = {};
    mp4lib.registerTypeBoxes = function() {
        boxTypeArray["moov"] = mp4lib.boxes.MovieBox;
        boxTypeArray["moof"] = mp4lib.boxes.MovieFragmentBox;
        boxTypeArray["ftyp"] = mp4lib.boxes.FileTypeBox;
        boxTypeArray["mfhd"] = mp4lib.boxes.MovieFragmentHeaderBox;
        boxTypeArray["mfra"] = mp4lib.boxes.MovieFragmentRandomAccessBox;
        boxTypeArray["udta"] = mp4lib.boxes.UserDataBox;
        boxTypeArray["trak"] = mp4lib.boxes.TrackBox;
        boxTypeArray["edts"] = mp4lib.boxes.EditBox;
        boxTypeArray["mdia"] = mp4lib.boxes.MediaBox;
        boxTypeArray["minf"] = mp4lib.boxes.MediaInformationBox;
        boxTypeArray["dinf"] = mp4lib.boxes.DataInformationBox;
        boxTypeArray["stbl"] = mp4lib.boxes.SampleTableBox;
        boxTypeArray["mvex"] = mp4lib.boxes.MovieExtendsBox;
        boxTypeArray["traf"] = mp4lib.boxes.TrackFragmentBox;
        boxTypeArray["meta"] = mp4lib.boxes.MetaBox;
        boxTypeArray["mvhd"] = mp4lib.boxes.MovieHeaderBox;
        boxTypeArray["mdat"] = mp4lib.boxes.MediaDataBox;
        boxTypeArray["free"] = mp4lib.boxes.FreeSpaceBox;
        boxTypeArray["sidx"] = mp4lib.boxes.SegmentIndexBox;
        boxTypeArray["tkhd"] = mp4lib.boxes.TrackHeaderBox;
        boxTypeArray["mdhd"] = mp4lib.boxes.MediaHeaderBox;
        boxTypeArray["mehd"] = mp4lib.boxes.MovieExtendsHeaderBox;
        boxTypeArray["hdlr"] = mp4lib.boxes.HandlerBox;
        boxTypeArray["stts"] = mp4lib.boxes.TimeToSampleBox;
        boxTypeArray["stsc"] = mp4lib.boxes.SampleToChunkBox;
        boxTypeArray["stco"] = mp4lib.boxes.ChunkOffsetBox;
        boxTypeArray["trex"] = mp4lib.boxes.TrackExtendsBox;
        boxTypeArray["vmhd"] = mp4lib.boxes.VideoMediaHeaderBox;
        boxTypeArray["smhd"] = mp4lib.boxes.SoundMediaHeaderBox;
        boxTypeArray["dref"] = mp4lib.boxes.DataReferenceBox;
        boxTypeArray["url "] = mp4lib.boxes.DataEntryUrlBox;
        boxTypeArray["urn "] = mp4lib.boxes.DataEntryUrnBox;
        boxTypeArray["tfhd"] = mp4lib.boxes.TrackFragmentHeaderBox;
        boxTypeArray["tfdt"] = mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox;
        boxTypeArray["trun"] = mp4lib.boxes.TrackFragmentRunBox;
        boxTypeArray["stsd"] = mp4lib.boxes.SampleDescriptionBox;
        boxTypeArray["sdtp"] = mp4lib.boxes.SampleDependencyTableBox;
        boxTypeArray["avc1"] = mp4lib.boxes.AVC1VisualSampleEntryBox;
        boxTypeArray["encv"] = mp4lib.boxes.EncryptedVideoBox;
        boxTypeArray["avcC"] = mp4lib.boxes.AVCConfigurationBox;
        boxTypeArray["pasp"] = mp4lib.boxes.PixelAspectRatioBox;
        boxTypeArray["mp4a"] = mp4lib.boxes.MP4AudioSampleEntryBox;
        boxTypeArray["enca"] = mp4lib.boxes.EncryptedAudioBox;
        boxTypeArray["esds"] = mp4lib.boxes.ESDBox;
        boxTypeArray["stsz"] = mp4lib.boxes.SampleSizeBox;
        boxTypeArray["pssh"] = mp4lib.boxes.ProtectionSystemSpecificHeaderBox;
        boxTypeArray["saiz"] = mp4lib.boxes.SampleAuxiliaryInformationSizesBox;
        boxTypeArray["saio"] = mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox;
        boxTypeArray["sinf"] = mp4lib.boxes.ProtectionSchemeInformationBox;
        boxTypeArray["schi"] = mp4lib.boxes.SchemeInformationBox;
        boxTypeArray["tenc"] = mp4lib.boxes.TrackEncryptionBox;
        boxTypeArray["schm"] = mp4lib.boxes.SchemeTypeBox;
        boxTypeArray["elst"] = mp4lib.boxes.EditListBox;
        boxTypeArray["hmhd"] = mp4lib.boxes.HintMediaHeaderBox;
        boxTypeArray["nmhd"] = mp4lib.boxes.NullMediaHeaderBox;
        boxTypeArray["ctts"] = mp4lib.boxes.CompositionOffsetBox;
        boxTypeArray["cslg"] = mp4lib.boxes.CompositionToDecodeBox;
        boxTypeArray["stss"] = mp4lib.boxes.SyncSampleBox;
        boxTypeArray["tref"] = mp4lib.boxes.TrackReferenceBox;
        boxTypeArray["frma"] = mp4lib.boxes.OriginalFormatBox;
        boxTypeArray["senc"] = mp4lib.boxes.SimpleEncryptionInformationBox;
        boxTypeArray[JSON.stringify([ 109, 29, 155, 5, 66, 213, 68, 230, 128, 226, 20, 29, 175, 247, 87, 178 ])] = mp4lib.boxes.TfxdBox;
        boxTypeArray[JSON.stringify([ 212, 128, 126, 242, 202, 57, 70, 149, 142, 84, 38, 203, 158, 70, 167, 159 ])] = mp4lib.boxes.TfrfBox;
        boxTypeArray[JSON.stringify([ 208, 138, 79, 24, 16, 243, 74, 130, 182, 200, 50, 216, 171, 161, 131, 211 ])] = mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox;
        boxTypeArray[JSON.stringify([ 137, 116, 219, 206, 123, 231, 76, 81, 132, 249, 113, 72, 249, 136, 37, 84 ])] = mp4lib.boxes.PiffTrackEncryptionBox;
        boxTypeArray[JSON.stringify([ 162, 57, 79, 82, 90, 155, 79, 20, 162, 68, 108, 66, 124, 100, 141, 244 ])] = mp4lib.boxes.PiffSampleEncryptionBox;
    };
    mp4lib.constructorTypeBox = function(type) {
        var obj, args;
        obj = Object.create(type.prototype);
        args = Array.prototype.slice.call(arguments, 1);
        type.apply(obj, args);
        return obj;
    };
    mp4lib.searchBox = function(boxtype, uuid) {
        var boxType;
        if (uuid) {
            boxType = boxTypeArray[uuid];
        } else {
            boxType = boxTypeArray[boxtype];
        }
        if (!boxType) {
            boxType = mp4lib.boxes.UnknownBox;
        }
        return boxType;
    };
    mp4lib.createBox = function(boxtype, size, uuid) {
        return mp4lib.constructorTypeBox.apply(null, [ mp4lib.searchBox(boxtype, uuid), size ]);
    };
    mp4lib.deserialize = function(uint8array) {
        var f = new mp4lib.boxes.File();
        try {
            f.read(uint8array);
        } catch (e) {
            mp4lib.warningHandler(e.message);
            return null;
        }
        return f;
    };
    mp4lib.serialize = function(f) {
        var file_size = f.getLength();
        var uint8array = new Uint8Array(file_size);
        f.write(uint8array);
        return uint8array;
    };
    mp4lib.ParseException = function(message) {
        this.message = message;
        this.name = "ParseException";
    };
    mp4lib.DataIntegrityException = function(message) {
        this.message = message;
        this.name = "DataIntegrityException";
    };
    return mp4lib;
}();

if (typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = mp4lib; else window.mp4lib = mp4lib;

mp4lib.boxes.File = function() {
    this.boxes = [];
};

mp4lib.boxes.File.prototype.getBoxByType = function(boxType) {
    for (var i = 0; i < this.boxes.length; i++) {
        if (this.boxes[i].boxtype === boxType) {
            return this.boxes[i];
        }
    }
    return null;
};

mp4lib.boxes.File.prototype.getLength = function() {
    var length = 0, i = 0;
    for (i = 0; i < this.boxes.length; i++) {
        this.boxes[i].computeLength();
        length += this.boxes[i].size;
    }
    return length;
};

mp4lib.boxes.File.prototype.write = function(data) {
    var pos = 0;
    for (var i = 0; i < this.boxes.length; i++) {
        pos = this.boxes[i].write(data, pos);
    }
};

mp4lib.boxes.File.prototype.read = function(data) {
    var size = 0, boxtype = null, uuidFieldPos = 0, uuid = null, pos = 0, end = data.length;
    while (pos < end) {
        size = mp4lib.fields.FIELD_UINT32.read(data, pos);
        boxtype = mp4lib.fields.readString(data, pos + 4, 4);
        if (boxtype == "uuid") {
            uuidFieldPos = size == 1 ? 16 : 8;
            uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(data, pos + uuidFieldPos, pos + uuidFieldPos + 16);
            uuid = JSON.stringify(uuid);
        }
        var box = mp4lib.createBox(boxtype, size, uuid);
        if (boxtype === "uuid") {
            pos = box.read(data, pos + mp4lib.fields.FIELD_INT8.getLength() * 16 + 8, pos + size);
            uuid = null;
        } else {
            pos = box.read(data, pos + 8, pos + size);
        }
        if (mp4lib.debug) box.__sourceBuffer = data.subarray(pos - box.size, pos);
        this.boxes.push(box);
        if (box.size <= 0 || box.size === null) {
            throw new mp4lib.ParseException("Problem on size of box " + box.boxtype + ", parsing stopped to avoid infinite loop");
        }
        if (!box.boxtype) {
            throw new mp4lib.ParseException("Problem on unknown box, parsing stopped to avoid infinite loop");
        }
    }
};

mp4lib.boxes.File.prototype.getBoxPositionByType = function(boxType) {
    var position = 0, i = 0;
    for (i = 0; i < this.boxes.length; i++) {
        if (this.boxes[i].boxtype === boxType) {
            return position;
        } else {
            position += this.boxes[i].size;
        }
    }
    return null;
};

mp4lib.boxes.Box = function(boxType, size, uuid, largesize) {
    this.size = size || null;
    this.boxtype = boxType;
    if (this.size === 1 && largesize) {
        this.largesize = largesize;
    }
    if (uuid) {
        this.extended_type = uuid;
    }
    this.localPos = 0;
    this.localEnd = 0;
};

mp4lib.boxes.Box.prototype.write = function(data, pos) {
    this.localPos = pos;
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.size);
    if (!this.extended_type) {
        this._writeData(data, mp4lib.fields.FIELD_ID, this.boxtype);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_ID, "uuid");
    }
    if (this.size === 1) {
        this._writeData(data, mp4lib.fields.FIELD_INT64, this.largesize);
    }
    if (this.extended_type) {
        for (var i = 0; i < 16; i++) {
            this._writeData(data, mp4lib.fields.FIELD_INT8, this.extended_type[i]);
        }
    }
};

mp4lib.boxes.Box.prototype.getBoxByType = function(boxType) {
    var i = 0;
    if (this.hasOwnProperty("boxes")) {
        for (i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].boxtype === boxType) {
                return this.boxes[i];
            }
        }
    }
    return null;
};

mp4lib.boxes.Box.prototype.getBoxesByType = function(boxType) {
    var resu = [], i = 0;
    if (this.hasOwnProperty("boxes")) {
        for (i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].boxtype === boxType) {
                resu.push(this.boxes[i]);
            }
        }
    }
    return resu;
};

mp4lib.boxes.Box.prototype.removeBoxByType = function(boxType) {
    if (this.hasOwnProperty("boxes")) {
        for (var i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].boxtype === boxType) {
                this.boxes.splice(i, 1);
            }
        }
    } else {
        mp4lib.warningHandler("" + this.boxtype + "does not have " + boxType + " box, impossible to remove it");
    }
};

mp4lib.boxes.Box.prototype.getBoxPositionByType = function(boxType) {
    var position = 0, i = 0;
    if (this.hasOwnProperty("boxes")) {
        for (i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].boxtype === boxType) {
                return position;
            } else {
                position += this.boxes[i].size;
            }
        }
    }
    return null;
};

mp4lib.boxes.Box.prototype.computeLength = function() {
    this.size = mp4lib.fields.FIELD_UINT32.getLength() + mp4lib.fields.FIELD_ID.getLength();
    if (this.extended_type) {
        this.size += mp4lib.fields.FIELD_INT8.getLength() * 16;
    }
};

mp4lib.boxes.Box.prototype._readData = function(data, dataType) {
    var resu = dataType.read(data, this.localPos, this.localEnd);
    this.localPos += dataType.getLength(resu);
    return resu;
};

mp4lib.boxes.Box.prototype._writeData = function(data, dataType, dataField) {
    if (dataField === undefined || dataField === null) {
        throw new mp4lib.ParseException("a field to write is null or undefined for box : " + this.boxtype);
    } else {
        dataType.write(data, this.localPos, dataField);
        this.localPos += dataType.getLength(dataField);
    }
};

mp4lib.boxes.Box.prototype._writeBuffer = function(data, dataField, size) {
    data.set(dataField, this.localPos);
    this.localPos += size;
};

mp4lib.boxes.Box.prototype._writeArrayData = function(data, dataArrayType, array) {
    if (array === undefined || array === null || array.length === 0) {
        throw new mp4lib.ParseException("an array to write is null, undefined or length = 0 for box : " + this.boxtype);
    }
    for (var i = 0; i < array.length; i++) {
        this._writeData(data, dataArrayType, array[i]);
    }
};

mp4lib.boxes.Box.prototype._readArrayData = function(data, dataArrayType) {
    var array = [];
    var dataArrayTypeLength = dataArrayType.getLength();
    var size = (this.localEnd - this.localPos) / dataArrayTypeLength;
    for (var i = 0; i < size; i++) {
        array.push(dataArrayType.read(data, this.localPos));
        this.localPos += dataArrayTypeLength;
    }
    return array;
};

mp4lib.boxes.Box.prototype._readArrayFieldData = function(data, dataArrayType, arraySize) {
    var innerFieldLength = -1;
    var array = [];
    for (var i = 0; i < arraySize; i++) {
        array.push(dataArrayType.read(data, this.localPos));
        if (innerFieldLength === -1) innerFieldLength = dataArrayType.getLength(array[i]);
        this.localPos += innerFieldLength;
    }
    return array;
};

mp4lib.boxes.ContainerBox = function(boxType, size) {
    mp4lib.boxes.Box.call(this, boxType, size);
    this.boxes = [];
};

mp4lib.boxes.ContainerBox.prototype = Object.create(mp4lib.boxes.Box.prototype);

mp4lib.boxes.ContainerBox.prototype.constructor = mp4lib.boxes.ContainerBox;

mp4lib.boxes.ContainerBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    var i = 0;
    for (i = 0; i < this.boxes.length; i++) {
        this.boxes[i].computeLength();
        this.size += this.boxes[i].size;
    }
};

mp4lib.boxes.ContainerBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    for (var i = 0; i < this.boxes.length; i++) {
        this.localPos = this.boxes[i].write(data, this.localPos);
    }
    return this.localPos;
};

mp4lib.boxes.ContainerBox.prototype.read = function(data, pos, end) {
    var size = 0, uuidFieldPos = 0, uuid = null, boxtype;
    while (pos < end) {
        size = mp4lib.fields.FIELD_UINT32.read(data, pos);
        boxtype = mp4lib.fields.readString(data, pos + 4, 4);
        if (boxtype === "uuid") {
            uuidFieldPos = size == 1 ? 16 : 8;
            uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(data, pos + uuidFieldPos, pos + uuidFieldPos + 16);
            uuid = JSON.stringify(uuid);
        }
        var box = mp4lib.createBox(boxtype, size, uuid);
        if (boxtype === "uuid") {
            pos = box.read(data, pos + mp4lib.fields.FIELD_INT8.getLength() * 16 + 8, pos + size);
            uuid = null;
        } else {
            pos = box.read(data, pos + 8, pos + size);
        }
        if (mp4lib.debug) box.__sourceBuffer = data.subarray(pos - box.size, pos);
        this.boxes.push(box);
        if (box.size <= 0 || box.size === null) {
            throw new mp4lib.ParseException("Problem on size of box " + box.boxtype + ", parsing stopped to avoid infinite loop");
        }
        if (!box.boxtype) {
            throw new mp4lib.ParseException("Problem on unknown box, parsing stopped to avoid infinite loop");
        }
    }
    return pos;
};

mp4lib.boxes.FullBox = function(boxType, size, uuid) {
    mp4lib.boxes.Box.call(this, boxType, size, uuid);
    this.version = null;
    this.flags = null;
};

mp4lib.boxes.FullBox.prototype = Object.create(mp4lib.boxes.Box.prototype);

mp4lib.boxes.FullBox.prototype.constructor = mp4lib.boxes.FullBox;

mp4lib.boxes.FullBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.version = this._readData(data, mp4lib.fields.FIELD_INT8);
    this.flags = this._readData(data, mp4lib.fields.FIELD_BIT24);
};

mp4lib.boxes.FullBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_INT8, this.version);
    this._writeData(data, mp4lib.fields.FIELD_BIT24, this.flags);
};

mp4lib.boxes.FullBox.prototype.getFullBoxAttributesLength = function() {
    this.size += mp4lib.fields.FIELD_INT8.getLength() + mp4lib.fields.FIELD_BIT24.getLength();
};

mp4lib.boxes.FullBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    mp4lib.boxes.FullBox.prototype.getFullBoxAttributesLength.call(this);
};

mp4lib.boxes.ContainerFullBox = function(boxType, size) {
    mp4lib.boxes.FullBox.call(this, boxType, size);
    this.boxes = [];
};

mp4lib.boxes.ContainerFullBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.ContainerFullBox.prototype.constructor = mp4lib.boxes.ContainerFullBox;

mp4lib.boxes.ContainerFullBox.prototype.computeLength = function(isEntryCount) {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    var i = 0;
    if (isEntryCount) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
    for (i = 0; i < this.boxes.length; i++) {
        this.boxes[i].computeLength();
        this.size += this.boxes[i].size;
    }
};

mp4lib.boxes.ContainerFullBox.prototype.read = function(data, pos, end, isEntryCount) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var size = 0, uuidFieldPos = 0, uuid = null, boxtype;
    if (isEntryCount) {
        this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    while (this.localPos < this.localEnd) {
        size = mp4lib.fields.FIELD_UINT32.read(data, this.localPos);
        boxtype = mp4lib.fields.readString(data, this.localPos + 4, 4);
        if (boxtype == "uuid") {
            uuidFieldPos = size == 1 ? 16 : 8;
            uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(data, this.localPos + uuidFieldPos, this.localPos + uuidFieldPos + 16);
            uuid = JSON.stringify(uuid);
        }
        var box = mp4lib.createBox(boxtype, size, uuid);
        if (boxtype === "uuid") {
            this.localPos = box.read(data, this.localPos + mp4lib.fields.FIELD_INT8.getLength() * 16 + 8, this.localPos + size);
            uuid = null;
        } else {
            this.localPos = box.read(data, this.localPos + 8, this.localPos + size);
        }
        if (mp4lib.debug) box.__sourceBuffer = data.subarray(this.localPos - box.size, this.localPos);
        this.boxes.push(box);
        if (box.size <= 0 || box.size === null) {
            throw new mp4lib.ParseException("Problem on size of box " + box.boxtype + ", parsing stopped to avoid infinite loop");
        }
        if (!box.boxtype) {
            throw new mp4lib.ParseException("Problem on unknown box, parsing stopped to avoid infinite loop");
        }
    }
    return this.localPos;
};

mp4lib.boxes.ContainerFullBox.prototype.write = function(data, pos, isEntryCount) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    if (isEntryCount === true) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    }
    for (var i = 0; i < this.boxes.length; i++) {
        this.localPos = this.boxes[i].write(data, this.localPos);
    }
    return this.localPos;
};

mp4lib.boxes.UnknownBox = function(size) {
    mp4lib.boxes.Box.call(this, null, size);
};

mp4lib.boxes.UnknownBox.prototype = Object.create(mp4lib.boxes.Box.prototype);

mp4lib.boxes.UnknownBox.prototype.constructor = mp4lib.boxes.UnknownBox;

mp4lib.boxes.UnknownBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.unrecognized_data = data.subarray(this.localPos, this.localEnd);
    return this.localEnd;
};

mp4lib.boxes.UnknownBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    this._writeBuffer(data, this.unrecognized_data, this.unrecognized_data.length);
    return this.localPos;
};

mp4lib.boxes.UnknownBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += this.unrecognized_data.length;
};

mp4lib.boxes.FileTypeBox = function(size) {
    mp4lib.boxes.Box.call(this, "ftyp", size);
};

mp4lib.boxes.FileTypeBox.prototype = Object.create(mp4lib.boxes.Box.prototype);

mp4lib.boxes.FileTypeBox.prototype.constructor = mp4lib.boxes.FileTypeBox;

mp4lib.boxes.FileTypeBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT32.getLength() * 2 + mp4lib.fields.FIELD_INT32.getLength() * this.compatible_brands.length;
};

mp4lib.boxes.FileTypeBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.major_brand = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.minor_brand = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.compatible_brands = this._readArrayData(data, mp4lib.fields.FIELD_INT32);
    return this.localPos;
};

mp4lib.boxes.FileTypeBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.major_brand);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.minor_brand);
    this._writeArrayData(data, mp4lib.fields.FIELD_INT32, this.compatible_brands);
    return this.localPos;
};

mp4lib.boxes.MovieBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "moov", size);
};

mp4lib.boxes.MovieBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.MovieBox.prototype.constructor = mp4lib.boxes.MovieBox;

mp4lib.boxes.MovieFragmentBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "moof", size);
};

mp4lib.boxes.MovieFragmentBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.MovieFragmentBox.prototype.constructor = mp4lib.boxes.MovieFragmentBox;

mp4lib.boxes.SimpleEncryptionInformationBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "senc", size);
};

mp4lib.boxes.SimpleEncryptionInformationBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.SimpleEncryptionInformationBox.prototype.constructor = mp4lib.boxes.SimpleEncryptionInformationBox;

mp4lib.boxes.SimpleEncryptionInformationBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    var i = 0, j = 0;
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    for (i = 0; i < this.sample_count; i++) {
        this.size += 8;
        if (this.flags & 2) {
            this.size += mp4lib.fields.FIELD_UINT16.getLength();
            for (j = 0; j < this.entry[i].NumberOfEntries; j++) {
                this.size += mp4lib.fields.FIELD_UINT16.getLength();
                this.size += mp4lib.fields.FIELD_UINT32.getLength();
            }
        }
    }
};

mp4lib.boxes.SimpleEncryptionInformationBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    for (var i = 0; i < this.sample_count; i++) {
        this._writeBuffer(data, this.entry[i].InitializationVector, 8);
        if (this.flags & 2) {
            this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entry[i].NumberOfEntries);
            for (var j = 0; j < this.entry[i].NumberOfEntries; j++) {
                this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entry[i].clearAndCryptedData[j].BytesOfClearData);
                this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].clearAndCryptedData[j].BytesOfEncryptedData);
            }
        }
    }
    return this.localPos;
};

mp4lib.boxes.SimpleEncryptionInformationBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.entry = [];
    for (var i = 0; i < this.sample_count; i++) {
        var struct = {};
        struct.InitializationVector = data.subarray(this.localPos, this.localPos + 8);
        this.localPos += 8;
        if (this.flags & 2) {
            struct.NumberOfEntries = this._readData(data, mp4lib.fields.FIELD_UINT16);
            struct.clearAndCryptedData = [];
            for (var j = 0; j < struct.NumberOfEntries; j++) {
                var clearAndCryptedStruct = {};
                clearAndCryptedStruct.BytesOfClearData = this._readData(data, mp4lib.fields.FIELD_UINT16);
                clearAndCryptedStruct.BytesOfEncryptedData = this._readData(data, mp4lib.fields.FIELD_UINT32);
                struct.clearAndCryptedData.push(clearAndCryptedStruct);
            }
        }
        this.entry.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.MovieFragmentRandomAccessBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "mfra", size);
};

mp4lib.boxes.MovieFragmentRandomAccessBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.MovieFragmentRandomAccessBox.prototype.constructor = mp4lib.boxes.MovieFragmentRandomAccessBox;

mp4lib.boxes.UserDataBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "udta", size);
};

mp4lib.boxes.UserDataBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.UserDataBox.prototype.constructor = mp4lib.boxes.UserDataBox;

mp4lib.boxes.TrackBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "trak", size);
};

mp4lib.boxes.TrackBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.TrackBox.prototype.constructor = mp4lib.boxes.TrackBox;

mp4lib.boxes.EditBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "edts", size);
};

mp4lib.boxes.EditBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.EditBox.prototype.constructor = mp4lib.boxes.EditBox;

mp4lib.boxes.MediaBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "mdia", size);
};

mp4lib.boxes.MediaBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.MediaBox.prototype.constructor = mp4lib.boxes.MediaBox;

mp4lib.boxes.MediaInformationBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "minf", size);
};

mp4lib.boxes.MediaInformationBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.MediaInformationBox.prototype.constructor = mp4lib.boxes.MediaInformationBox;

mp4lib.boxes.DataInformationBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "dinf", size);
};

mp4lib.boxes.DataInformationBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.DataInformationBox.prototype.constructor = mp4lib.boxes.DataInformationBox;

mp4lib.boxes.SampleTableBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "stbl", size);
};

mp4lib.boxes.SampleTableBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.SampleTableBox.prototype.constructor = mp4lib.boxes.SampleTableBox;

mp4lib.boxes.MovieExtendsBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "mvex", size);
};

mp4lib.boxes.MovieExtendsBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.MovieExtendsBox.prototype.constructor = mp4lib.boxes.MovieExtendsBox;

mp4lib.boxes.TrackFragmentBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "traf", size);
};

mp4lib.boxes.TrackFragmentBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.TrackFragmentBox.prototype.constructor = mp4lib.boxes.TrackFragmentBox;

mp4lib.boxes.MetaBox = function(size) {
    mp4lib.boxes.ContainerFullBox.call(this, "meta", size);
};

mp4lib.boxes.MetaBox.prototype = Object.create(mp4lib.boxes.ContainerFullBox.prototype);

mp4lib.boxes.MetaBox.prototype.constructor = mp4lib.boxes.MetaBox;

mp4lib.boxes.MetaBox.prototype.computeLength = function() {
    mp4lib.boxes.ContainerFullBox.prototype.computeLength.call(this, false);
};

mp4lib.boxes.MetaBox.prototype.read = function(data, pos, end) {
    return mp4lib.boxes.ContainerFullBox.prototype.read.call(this, data, pos, end, false);
};

mp4lib.boxes.MetaBox.prototype.write = function(data, pos) {
    return mp4lib.boxes.ContainerFullBox.prototype.write.call(this, data, pos, false);
};

mp4lib.boxes.MovieHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "mvhd", size);
};

mp4lib.boxes.MovieHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.MovieHeaderBox.prototype.constructor = mp4lib.boxes.MovieHeaderBox;

mp4lib.boxes.MovieHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT32.getLength() + mp4lib.fields.FIELD_INT16.getLength() * 2;
    this.size += mp4lib.fields.FIELD_INT32.getLength() * 2 + mp4lib.fields.FIELD_INT32.getLength() * 9;
    this.size += mp4lib.fields.FIELD_BIT32.getLength() * 6 + mp4lib.fields.FIELD_UINT32.getLength();
    if (this.version === 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 3 + mp4lib.fields.FIELD_UINT32.getLength();
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 4;
    }
};

mp4lib.boxes.MovieHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.timescale);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.duration);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.timescale);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.duration);
    }
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.rate);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.volume);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.reserved);
    this._writeArrayData(data, mp4lib.fields.FIELD_INT32, this.reserved_2);
    this._writeArrayData(data, mp4lib.fields.FIELD_INT32, this.matrix);
    this._writeArrayData(data, mp4lib.fields.FIELD_BIT32, this.pre_defined);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.next_track_ID);
    return this.localPos;
};

mp4lib.boxes.MovieHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    if (this.version == 1) {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.timescale = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.timescale = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    this.rate = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.volume = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.reserved = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.reserved_2 = this._readArrayFieldData(data, mp4lib.fields.FIELD_INT32, 2);
    this.matrix = this._readArrayFieldData(data, mp4lib.fields.FIELD_INT32, 9);
    this.pre_defined = this._readArrayFieldData(data, mp4lib.fields.FIELD_BIT32, 6);
    this.next_track_ID = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.MediaDataBox = function(size) {
    mp4lib.boxes.Box.call(this, "mdat", size);
};

mp4lib.boxes.MediaDataBox.prototype = Object.create(mp4lib.boxes.Box.prototype);

mp4lib.boxes.MediaDataBox.prototype.constructor = mp4lib.boxes.MediaDataBox;

mp4lib.boxes.MediaDataBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += this.data.length;
};

mp4lib.boxes.MediaDataBox.prototype.read = function(data, pos, end) {
    this.data = data.subarray(pos, end);
    return end;
};

mp4lib.boxes.MediaDataBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    this._writeBuffer(data, this.data, this.data.length);
    return this.localPos;
};

mp4lib.boxes.FreeSpaceBox = function(size) {
    mp4lib.boxes.Box.call(this, "free", size);
};

mp4lib.boxes.FreeSpaceBox.prototype = Object.create(mp4lib.boxes.Box.prototype);

mp4lib.boxes.FreeSpaceBox.prototype.constructor = mp4lib.boxes.FreeSpaceBox;

mp4lib.boxes.FreeSpaceBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += this.data.length;
};

mp4lib.boxes.FreeSpaceBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.data = data.subarray(this.localPos, this.localEnd);
    return this.localEnd;
};

mp4lib.boxes.FreeSpaceBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    this._writeBuffer(data, this.data, this.data.length);
    return this.localPos;
};

mp4lib.boxes.SegmentIndexBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "sidx", size);
};

mp4lib.boxes.SegmentIndexBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.SegmentIndexBox.prototype.constructor = mp4lib.boxes.SegmentIndexBox;

mp4lib.boxes.SegmentIndexBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2;
    if (this.version === 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 2;
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2;
    }
    this.size += mp4lib.fields.FIELD_UINT16.getLength();
    this.size += mp4lib.fields.FIELD_UINT16.getLength();
    this.size += (mp4lib.fields.FIELD_UINT64.getLength() + mp4lib.fields.FIELD_UINT32.getLength()) * this.reference_count;
};

mp4lib.boxes.SegmentIndexBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.reference_ID = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.timescale = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if (this.version === 1) {
        this.earliest_presentation_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.first_offset = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.earliest_presentation_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.first_offset = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    this.reserved = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.reference_count = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.references = [];
    for (var i = 0; i < this.reference_count; i++) {
        var struct = {};
        struct.reference_info = this._readData(data, mp4lib.fields.FIELD_UINT64);
        struct.SAP = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.references.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.SegmentIndexBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.reference_ID);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.timescale);
    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.earliest_presentation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.first_offset);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.earliest_presentation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.first_offset);
    }
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.reserved);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.reference_count);
    for (var i = 0; i < this.reference_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.references[i].reference_info);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.references[i].SAP);
    }
    return this.localPos;
};

mp4lib.boxes.TrackHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "tkhd", size);
};

mp4lib.boxes.TrackHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.TrackHeaderBox.prototype.constructor = mp4lib.boxes.TrackHeaderBox;

mp4lib.boxes.TrackHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT16.getLength() * 4 + mp4lib.fields.FIELD_INT32.getLength() * 2 + mp4lib.fields.FIELD_UINT32.getLength() * 2 + mp4lib.fields.FIELD_INT32.getLength() * 9;
    if (this.version == 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 3 + mp4lib.fields.FIELD_UINT32.getLength() * 2;
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 5;
    }
};

mp4lib.boxes.TrackHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    if (this.version === 1) {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.track_id = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.reserved = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.track_id = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.reserved = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    this.reserved_2 = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, 2);
    this.layer = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.alternate_group = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.volume = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.reserved_3 = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.matrix = this._readArrayFieldData(data, mp4lib.fields.FIELD_INT32, 9);
    this.width = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.height = this._readData(data, mp4lib.fields.FIELD_INT32);
    return this.localPos;
};

mp4lib.boxes.TrackHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.track_id);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.reserved);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.duration);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.track_id);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.reserved);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.duration);
    }
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT32, this.reserved_2);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.layer);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.alternate_group);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.volume);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.reserved_3);
    this._writeArrayData(data, mp4lib.fields.FIELD_INT32, this.matrix);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.width);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.height);
    return this.localPos;
};

mp4lib.boxes.MediaHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "mdhd", size);
};

mp4lib.boxes.MediaHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.MediaHeaderBox.prototype.constructor = mp4lib.boxes.MediaHeaderBox;

mp4lib.boxes.MediaHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT16.getLength() * 2;
    if (this.version == 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 3 + mp4lib.fields.FIELD_UINT32.getLength();
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 4;
    }
};

mp4lib.boxes.MediaHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    if (this.version === 1) {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.timescale = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.timescale = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    this.language = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.pre_defined = this._readData(data, mp4lib.fields.FIELD_UINT16);
    return this.localPos;
};

mp4lib.boxes.MediaHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.timescale);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.duration);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.timescale);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.duration);
    }
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.language);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.pre_defined);
    return this.localPos;
};

mp4lib.boxes.MovieExtendsHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "mehd", size);
};

mp4lib.boxes.MovieExtendsHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.MovieExtendsHeaderBox.prototype.constructor = mp4lib.boxes.MovieExtendsHeaderBox;

mp4lib.boxes.MovieExtendsHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.version == 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength();
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
};

mp4lib.boxes.MovieExtendsHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    if (this.version === 1) {
        this.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    return this.localPos;
};

mp4lib.boxes.MovieExtendsHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.fragment_duration);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.fragment_duration);
    }
    return this.localPos;
};

mp4lib.boxes.HandlerBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "hdlr", size);
};

mp4lib.boxes.HandlerBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.HandlerBox.prototype.constructor = mp4lib.boxes.HandlerBox;

mp4lib.boxes.HandlerBox.prototype.HANDLERTYPEVIDEO = "vide";

mp4lib.boxes.HandlerBox.prototype.HANDLERTYPEAUDIO = "soun";

mp4lib.boxes.HandlerBox.prototype.HANDLERTYPETEXT = "meta";

mp4lib.boxes.HandlerBox.prototype.HANDLERVIDEONAME = "Video Track";

mp4lib.boxes.HandlerBox.prototype.HANDLERAUDIONAME = "Audio Track";

mp4lib.boxes.HandlerBox.prototype.HANDLERTEXTNAME = "Text Track";

mp4lib.boxes.HandlerBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2 + mp4lib.fields.FIELD_UINT32.getLength() * 3 + mp4lib.fields.FIELD_STRING.getLength(this.name);
};

mp4lib.boxes.HandlerBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.pre_defined = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.handler_type = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.reserved = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, 3);
    this.name = this._readData(data, mp4lib.fields.FIELD_STRING);
    return this.localPos;
};

mp4lib.boxes.HandlerBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.pre_defined);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.handler_type);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT32, this.reserved);
    this._writeData(data, mp4lib.fields.FIELD_STRING, this.name);
    return this.localPos;
};

mp4lib.boxes.TimeToSampleBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "stts", size);
};

mp4lib.boxes.TimeToSampleBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.TimeToSampleBox.prototype.constructor = mp4lib.boxes.TimeToSampleBox;

mp4lib.boxes.TimeToSampleBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    this.size += this.entry_count * (mp4lib.fields.FIELD_UINT32.getLength() * 2);
};

mp4lib.boxes.TimeToSampleBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.entry = [];
    for (var i = 0; i < this.entry_count; i++) {
        var struct = {};
        struct.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
        struct.sample_delta = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.entry.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.TimeToSampleBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    for (var i = 0; i < this.entry_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].sample_count);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].sample_delta);
    }
    return this.localPos;
};

mp4lib.boxes.SampleToChunkBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "stsc", size);
};

mp4lib.boxes.SampleToChunkBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.SampleToChunkBox.prototype.constructor = mp4lib.boxes.SampleToChunkBox;

mp4lib.boxes.SampleToChunkBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    this.size += this.entry_count * (mp4lib.fields.FIELD_UINT32.getLength() * 3);
};

mp4lib.boxes.SampleToChunkBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.entry = [];
    for (var i = 0; i < this.entry_count; i++) {
        var struct = {};
        struct.first_chunk = this._readData(data, mp4lib.fields.FIELD_UINT32);
        struct.samples_per_chunk = this._readData(data, mp4lib.fields.FIELD_UINT32);
        struct.samples_description_index = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.entry.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.SampleToChunkBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    for (var i = 0; i < this.entry_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].first_chunk);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].samples_per_chunk);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].samples_description_index);
    }
    return this.localPos;
};

mp4lib.boxes.ChunkOffsetBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "stco", size);
};

mp4lib.boxes.ChunkOffsetBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.ChunkOffsetBox.prototype.constructor = mp4lib.boxes.ChunkOffsetBox;

mp4lib.boxes.ChunkOffsetBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() + this.entry_count * mp4lib.fields.FIELD_UINT32.getLength();
};

mp4lib.boxes.ChunkOffsetBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.chunk_offset = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    return this.localPos;
};

mp4lib.boxes.ChunkOffsetBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    for (var i = 0; i < this.entry_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.chunk_offset[i]);
    }
    return this.localPos;
};

mp4lib.boxes.TrackExtendsBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "trex", size);
};

mp4lib.boxes.TrackExtendsBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.TrackExtendsBox.prototype.constructor = mp4lib.boxes.TrackExtendsBox;

mp4lib.boxes.TrackExtendsBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 5;
};

mp4lib.boxes.TrackExtendsBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.track_ID = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.default_sample_description_index = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.default_sample_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.default_sample_size = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.default_sample_flags = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.TrackExtendsBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.track_ID);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_description_index);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_duration);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_size);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_flags);
    return this.localPos;
};

mp4lib.boxes.VideoMediaHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "vmhd", size);
};

mp4lib.boxes.VideoMediaHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.VideoMediaHeaderBox.prototype.constructor = mp4lib.boxes.VideoMediaHeaderBox;

mp4lib.boxes.VideoMediaHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT16.getLength() + mp4lib.fields.FIELD_UINT16.getLength() * 3;
};

mp4lib.boxes.VideoMediaHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.graphicsmode = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.opcolor = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT16, 3);
    return this.localPos;
};

mp4lib.boxes.VideoMediaHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.graphicsmode);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT16, this.opcolor);
    return this.localPos;
};

mp4lib.boxes.SoundMediaHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "smhd", size);
};

mp4lib.boxes.SoundMediaHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.SoundMediaHeaderBox.prototype.constructor = mp4lib.boxes.SoundMediaHeaderBox;

mp4lib.boxes.SoundMediaHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT16.getLength() + mp4lib.fields.FIELD_UINT16.getLength();
};

mp4lib.boxes.SoundMediaHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.balance = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.reserved = this._readData(data, mp4lib.fields.FIELD_UINT16);
    return this.localPos;
};

mp4lib.boxes.SoundMediaHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.balance);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.reserved);
    return this.localPos;
};

mp4lib.boxes.DataReferenceBox = function(size) {
    mp4lib.boxes.ContainerFullBox.call(this, "dref", size);
};

mp4lib.boxes.DataReferenceBox.prototype = Object.create(mp4lib.boxes.ContainerFullBox.prototype);

mp4lib.boxes.DataReferenceBox.prototype.constructor = mp4lib.boxes.DataReferenceBox;

mp4lib.boxes.DataReferenceBox.prototype.computeLength = function() {
    mp4lib.boxes.ContainerFullBox.prototype.computeLength.call(this, true);
};

mp4lib.boxes.DataReferenceBox.prototype.read = function(data, pos, end) {
    return mp4lib.boxes.ContainerFullBox.prototype.read.call(this, data, pos, end, true);
};

mp4lib.boxes.DataReferenceBox.prototype.write = function(data, pos) {
    if (!this.entry_count) {
        this.entry_count = this.boxes.length;
    }
    return mp4lib.boxes.ContainerFullBox.prototype.write.call(this, data, pos, true);
};

mp4lib.boxes.DataEntryUrlBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "url ", size);
};

mp4lib.boxes.DataEntryUrlBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.DataEntryUrlBox.prototype.constructor = mp4lib.boxes.DataEntryUrlBox;

mp4lib.boxes.DataEntryUrlBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.location !== undefined) {
        this.size += mp4lib.fields.FIELD_STRING.getLength(this.location);
    }
};

mp4lib.boxes.DataEntryUrlBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    if (this.flags & "0x000001" === 0) {
        this.location = this._readData(data, mp4lib.fields.FIELD_STRING);
    }
    return this.localPos;
};

mp4lib.boxes.DataEntryUrlBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    if (this.location !== undefined) {
        this._writeData(data, mp4lib.fields.FIELD_STRING, this.location);
    }
    return this.localPos;
};

mp4lib.boxes.DataEntryUrnBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "urn ", size);
};

mp4lib.boxes.DataEntryUrnBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.DataEntryUrnBox.prototype.constructor = mp4lib.boxes.DataEntryUrnBox;

mp4lib.boxes.DataEntryUrnBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.flags & "0x000001" === 0) {
        this.size += mp4lib.fields.FIELD_STRING.getLength(this.name) + mp4lib.fields.FIELD_STRING.getLength(this.location);
    }
};

mp4lib.boxes.DataEntryUrnBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    if (this.flags & "0x000001" === 0) {
        this.name = this._readData(data, mp4lib.fields.FIELD_STRING);
        this.location = this._readData(data, mp4lib.fields.FIELD_STRING);
    }
    return this.localPos;
};

mp4lib.boxes.DataEntryUrnBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    if (this.flags & "0x000001" === 0) {
        this._writeData(data, mp4lib.fields.FIELD_STRING, this.name);
        this._writeData(data, mp4lib.fields.FIELD_STRING, this.location);
    }
    return this.localPos;
};

mp4lib.boxes.MovieFragmentHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "mfhd", size);
};

mp4lib.boxes.MovieFragmentHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.MovieFragmentHeaderBox.prototype.constructor = mp4lib.boxes.MovieFragmentHeaderBox;

mp4lib.boxes.MovieFragmentHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
};

mp4lib.boxes.MovieFragmentHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.sequence_number = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.MovieFragmentHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sequence_number);
    return this.localPos;
};

mp4lib.boxes.TrackFragmentHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "tfhd", size);
};

mp4lib.boxes.TrackFragmentHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.TrackFragmentHeaderBox.prototype.constructor = mp4lib.boxes.TrackFragmentHeaderBox;

mp4lib.boxes.TrackFragmentHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    if ((this.flags & 1) !== 0 && this.base_data_offset !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength();
    }
    if ((this.flags & 2) !== 0 && this.sample_description_index !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
    if ((this.flags & 8) !== 0 && this.default_sample_duration !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
    if ((this.flags & 16) !== 0 && this.default_sample_size !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
    if ((this.flags & 32) !== 0 && this.default_sample_flags !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
};

mp4lib.boxes.TrackFragmentHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.track_ID = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if ((this.flags & 1) !== 0) {
        this.base_data_offset = this._readData(data, mp4lib.fields.FIELD_UINT64);
    }
    if ((this.flags & 2) !== 0) {
        this.sample_description_index = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    if ((this.flags & 8) !== 0) {
        this.default_sample_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    if ((this.flags & 16) !== 0) {
        this.default_sample_size = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    if ((this.flags & 32) !== 0) {
        this.default_sample_flags = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    return this.localPos;
};

mp4lib.boxes.TrackFragmentHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.track_ID);
    if ((this.flags & 1) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.base_data_offset);
    }
    if ((this.flags & 2) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_description_index);
    }
    if ((this.flags & 8) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_duration);
    }
    if ((this.flags & 16) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_size);
    }
    if ((this.flags & 32) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_flags);
    }
    return this.localPos;
};

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "tfdt", size);
};

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype.constructor = mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox;

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.version === 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength();
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
};

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    if (this.version === 1) {
        this.baseMediaDecodeTime = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.baseMediaDecodeTime = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    return this.localPos;
};

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.baseMediaDecodeTime);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.baseMediaDecodeTime);
    }
    return this.localPos;
};

mp4lib.boxes.TrackFragmentRunBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "trun", size);
};

mp4lib.boxes.TrackFragmentRunBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.TrackFragmentRunBox.prototype.constructor = mp4lib.boxes.TrackFragmentRunBox;

mp4lib.boxes.TrackFragmentRunBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    var i = 0;
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    if ((this.flags & 1) !== 0 && this.data_offset !== undefined) {
        this.size += mp4lib.fields.FIELD_INT32.getLength();
    }
    if ((this.flags & 4) !== 0 && this.first_sample_flags !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
    for (i = 0; i < this.sample_count; i++) {
        if ((this.flags & 256) !== 0 && this.samples_table[i].sample_duration !== undefined) {
            this.size += mp4lib.fields.FIELD_UINT32.getLength();
        }
        if ((this.flags & 512) !== 0 && this.samples_table[i].sample_size !== undefined) {
            this.size += mp4lib.fields.FIELD_UINT32.getLength();
        }
        if ((this.flags & 1024) !== 0 && this.samples_table[i].sample_flags !== undefined) {
            this.size += mp4lib.fields.FIELD_UINT32.getLength();
        }
        if (this.version === 1) {
            if ((this.flags & 2048) !== 0 && this.samples_table[i].sample_composition_time_offset !== undefined) {
                this.size += mp4lib.fields.FIELD_INT32.getLength();
            }
        } else {
            if ((this.flags & 2048) !== 0 && this.samples_table[i].sample_composition_time_offset !== undefined) {
                this.size += mp4lib.fields.FIELD_UINT32.getLength();
            }
        }
    }
};

mp4lib.boxes.TrackFragmentRunBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if ((this.flags & 1) !== 0) {
        this.data_offset = this._readData(data, mp4lib.fields.FIELD_INT32);
    }
    if ((this.flags & 4) !== 0) {
        this.first_sample_flags = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    this.samples_table = [];
    for (var i = 0; i < this.sample_count; i++) {
        var struct = {};
        if ((this.flags & 256) !== 0) {
            struct.sample_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
        }
        if ((this.flags & 512) !== 0) {
            struct.sample_size = this._readData(data, mp4lib.fields.FIELD_UINT32);
        }
        if ((this.flags & 1024) !== 0) {
            struct.sample_flags = this._readData(data, mp4lib.fields.FIELD_UINT32);
        }
        if (this.version === 1) {
            if ((this.flags & 2048) !== 0) {
                struct.sample_composition_time_offset = this._readData(data, mp4lib.fields.FIELD_INT32);
            }
        } else {
            if ((this.flags & 2048) !== 0) {
                struct.sample_composition_time_offset = this._readData(data, mp4lib.fields.FIELD_UINT32);
            }
        }
        this.samples_table.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.TrackFragmentRunBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    if ((this.flags & 1) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_INT32, this.data_offset);
    }
    if ((this.flags & 4) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.first_sample_flags);
    }
    for (var i = 0; i < this.sample_count; i++) {
        if ((this.flags & 256) !== 0) {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.samples_table[i].sample_duration);
        }
        if ((this.flags & 512) !== 0) {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.samples_table[i].sample_size);
        }
        if ((this.flags & 1024) !== 0) {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.samples_table[i].sample_flags);
        }
        if (this.version === 1) {
            if ((this.flags & 2048) !== 0) {
                this._writeData(data, mp4lib.fields.FIELD_INT32, this.samples_table[i].sample_composition_time_offset);
            }
        } else {
            if ((this.flags & 2048) !== 0) {
                this._writeData(data, mp4lib.fields.FIELD_UINT32, this.samples_table[i].sample_composition_time_offset);
            }
        }
    }
    return this.localPos;
};

mp4lib.boxes.SampleDescriptionBox = function(size) {
    mp4lib.boxes.ContainerFullBox.call(this, "stsd", size);
};

mp4lib.boxes.SampleDescriptionBox.prototype = Object.create(mp4lib.boxes.ContainerFullBox.prototype);

mp4lib.boxes.SampleDescriptionBox.prototype.constructor = mp4lib.boxes.SampleDescriptionBox;

mp4lib.boxes.SampleDescriptionBox.prototype.computeLength = function() {
    mp4lib.boxes.ContainerFullBox.prototype.computeLength.call(this, true);
};

mp4lib.boxes.SampleDescriptionBox.prototype.read = function(data, pos, end) {
    return mp4lib.boxes.ContainerFullBox.prototype.read.call(this, data, pos, end, true);
};

mp4lib.boxes.SampleDescriptionBox.prototype.write = function(data, pos) {
    this.entry_count = this.boxes.length;
    return mp4lib.boxes.ContainerFullBox.prototype.write.call(this, data, pos, true);
};

mp4lib.boxes.SampleDependencyTableBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "sdtp", size);
};

mp4lib.boxes.SampleDependencyTableBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.SampleDependencyTableBox.prototype.constructor = mp4lib.boxes.SampleDependencyTableBox;

mp4lib.boxes.SampleDependencyTableBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * this.sample_dependency_array.length;
};

mp4lib.boxes.SampleDependencyTableBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.sample_dependency_array = this._readArrayData(data, mp4lib.fields.FIELD_UINT8);
    return this.localPos;
};

mp4lib.boxes.SampleDependencyTableBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT8, this.sample_dependency_array);
    return this.localPos;
};

mp4lib.boxes.SampleEntryBox = function(boxType, size) {
    mp4lib.boxes.Box.call(this, boxType, size);
};

mp4lib.boxes.SampleEntryBox.prototype = Object.create(mp4lib.boxes.Box.prototype);

mp4lib.boxes.SampleEntryBox.prototype.constructor = mp4lib.boxes.SampleEntryBox;

mp4lib.boxes.SampleEntryBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT16.getLength() + mp4lib.fields.FIELD_UINT8.getLength() * 6;
};

mp4lib.boxes.SampleEntryBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.reserved = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, 6);
    this.data_reference_index = this._readData(data, mp4lib.fields.FIELD_UINT16);
    return this.localPos;
};

mp4lib.boxes.SampleEntryBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT8, this.reserved);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.data_reference_index);
    return this.localPos;
};

mp4lib.boxes.VisualSampleEntryBox = function(boxType, size) {
    mp4lib.boxes.SampleEntryBox.call(this, boxType, size);
};

mp4lib.boxes.VisualSampleEntryBox.prototype = Object.create(mp4lib.boxes.SampleEntryBox.prototype);

mp4lib.boxes.VisualSampleEntryBox.prototype.constructor = mp4lib.boxes.VisualSampleEntryBox;

mp4lib.boxes.VisualSampleEntryBox.prototype.computeLength = function() {
    mp4lib.boxes.SampleEntryBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT16.getLength() * 7 + mp4lib.fields.FIELD_UINT32.getLength() * 3;
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 3;
    this.size += 32;
};

mp4lib.boxes.VisualSampleEntryBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.SampleEntryBox.prototype.read.call(this, data, pos, end);
    this.pre_defined = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.reserved_2 = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.pre_defined_2 = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, 3);
    this.width = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.height = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.horizresolution = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.vertresolution = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.reserved_3 = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.frame_count = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.compressorname = new mp4lib.fields.FixedLenStringField(32);
    this.compressorname = this.compressorname.read(data, this.localPos);
    this.localPos += 32;
    this.depth = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.pre_defined_3 = this._readData(data, mp4lib.fields.FIELD_INT16);
    return this.localPos;
};

mp4lib.boxes.VisualSampleEntryBox.prototype.write = function(data, pos) {
    mp4lib.boxes.SampleEntryBox.prototype.write.call(this, data, pos);
    var i = 0;
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.pre_defined);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.reserved_2);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT32, this.pre_defined_2);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.width);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.height);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.horizresolution);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.vertresolution);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.reserved_3);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.frame_count);
    for (i = 0; i < 32; i++) {
        data[this.localPos + i] = this.compressorname.charCodeAt(i);
    }
    this.localPos += 32;
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.depth);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.pre_defined_3);
    return this.localPos;
};

mp4lib.boxes.VisualSampleEntryContainerBox = function(boxType, size) {
    mp4lib.boxes.VisualSampleEntryBox.call(this, boxType, size);
    this.boxes = [];
};

mp4lib.boxes.VisualSampleEntryContainerBox.prototype = Object.create(mp4lib.boxes.VisualSampleEntryBox.prototype);

mp4lib.boxes.VisualSampleEntryContainerBox.prototype.constructor = mp4lib.boxes.VisualSampleEntryContainerBox;

mp4lib.boxes.VisualSampleEntryContainerBox.prototype.computeLength = function() {
    mp4lib.boxes.VisualSampleEntryBox.prototype.computeLength.call(this);
    var i = 0;
    for (i = 0; i < this.boxes.length; i++) {
        this.boxes[i].computeLength();
        this.size += this.boxes[i].size;
    }
};

mp4lib.boxes.VisualSampleEntryContainerBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.VisualSampleEntryBox.prototype.read.call(this, data, pos, end);
    var size = 0, uuidFieldPos = 0, uuid = null, boxtype;
    while (this.localPos < this.localEnd) {
        size = mp4lib.fields.FIELD_UINT32.read(data, this.localPos);
        boxtype = mp4lib.fields.readString(data, this.localPos + 4, 4);
        if (boxtype == "uuid") {
            uuidFieldPos = size == 1 ? 16 : 8;
            uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(data, this.localPos + uuidFieldPos, this.localPos + uuidFieldPos + 16);
            uuid = JSON.stringify(uuid);
        }
        var box = mp4lib.createBox(boxtype, size, uuid);
        if (boxtype === "uuid") {
            this.localPos = box.read(data, this.localPos + mp4lib.fields.FIELD_INT8.getLength() * 16 + 8, this.localPos + size);
        } else {
            this.localPos = box.read(data, this.localPos + 8, this.localPos + size);
        }
        if (mp4lib.debug) box.__sourceBuffer = data.subarray(this.localPos - box.size, this.localPos);
        this.boxes.push(box);
        if (box.size <= 0 || box.size === null) {
            throw new mp4lib.ParseException("Problem on size of box " + box.boxtype + ", parsing stopped to avoid infinite loop");
        }
        if (!box.boxtype) {
            throw new mp4lib.ParseException("Problem on unknown box, parsing stopped to avoid infinite loop");
        }
    }
    return this.localPos;
};

mp4lib.boxes.VisualSampleEntryContainerBox.prototype.write = function(data, pos) {
    mp4lib.boxes.VisualSampleEntryBox.prototype.write.call(this, data, pos);
    for (var i = 0; i < this.boxes.length; i++) {
        this.localPos = this.boxes[i].write(data, this.localPos);
    }
    return this.localPos;
};

mp4lib.boxes.AVC1VisualSampleEntryBox = function(size) {
    mp4lib.boxes.VisualSampleEntryContainerBox.call(this, "avc1", size);
};

mp4lib.boxes.AVC1VisualSampleEntryBox.prototype = Object.create(mp4lib.boxes.VisualSampleEntryContainerBox.prototype);

mp4lib.boxes.AVC1VisualSampleEntryBox.prototype.constructor = mp4lib.boxes.AVC1VisualSampleEntryBox;

mp4lib.boxes.EncryptedVideoBox = function(size) {
    mp4lib.boxes.VisualSampleEntryContainerBox.call(this, "encv", size);
};

mp4lib.boxes.EncryptedVideoBox.prototype = Object.create(mp4lib.boxes.VisualSampleEntryContainerBox.prototype);

mp4lib.boxes.EncryptedVideoBox.prototype.constructor = mp4lib.boxes.EncryptedVideoBox;

mp4lib.boxes.AVCConfigurationBox = function(size) {
    mp4lib.boxes.Box.call(this, "avcC", size);
};

mp4lib.boxes.AVCConfigurationBox.prototype = Object.create(mp4lib.boxes.Box.prototype);

mp4lib.boxes.AVCConfigurationBox.prototype.constructor = mp4lib.boxes.AVCConfigurationBox;

mp4lib.boxes.AVCConfigurationBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * 4 + mp4lib.fields.FIELD_UINT8.getLength() * 3;
    this.size += this._getNALLength(this.numOfSequenceParameterSets, this.SPS_NAL);
    this.size += this._getNALLength(this.numOfPictureParameterSets, this.PPS_NAL);
};

mp4lib.boxes.AVCConfigurationBox.prototype._getNALLength = function(nbElements, nalArray) {
    var size_NAL = 0;
    for (var i = 0; i < nbElements; i++) {
        size_NAL += mp4lib.fields.FIELD_UINT16.getLength() + nalArray[i].NAL_length;
    }
    return size_NAL;
};

mp4lib.boxes.AVCConfigurationBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.configurationVersion = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.AVCProfileIndication = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.profile_compatibility = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.AVCLevelIndication = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.temp = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.lengthSizeMinusOne = this.temp & 3;
    this.numOfSequenceParameterSets_tmp = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.numOfSequenceParameterSets = this.numOfSequenceParameterSets_tmp & 31;
    this.SPS_NAL = this._readNAL(data, this.numOfSequenceParameterSets);
    this.numOfPictureParameterSets = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.PPS_NAL = this._readNAL(data, this.numOfPictureParameterSets);
    return this.localPos;
};

mp4lib.boxes.AVCConfigurationBox.prototype._readNAL = function(data, nbElements) {
    var nalArray = [];
    for (var i = 0; i < nbElements; i++) {
        var struct = {};
        struct.NAL_length = this._readData(data, mp4lib.fields.FIELD_UINT16);
        struct.NAL = data.subarray(this.localPos, this.localPos + struct.NAL_length);
        this.localPos += struct.NAL_length;
        nalArray.push(struct);
    }
    return nalArray;
};

mp4lib.boxes.AVCConfigurationBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.configurationVersion);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.AVCProfileIndication);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.profile_compatibility);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.AVCLevelIndication);
    this.temp = this.lengthSizeMinusOne | 252;
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.temp);
    this.numOfSequenceParameterSets = this.SPS_NAL.length;
    this.numOfSequenceParameterSets_tmp = this.numOfSequenceParameterSets | 224;
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.numOfSequenceParameterSets_tmp);
    this._writeNAL(data, this.numOfSequenceParameterSets, this.SPS_NAL);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.numOfPictureParameterSets);
    this._writeNAL(data, this.numOfPictureParameterSets, this.PPS_NAL);
    return this.localPos;
};

mp4lib.boxes.AVCConfigurationBox.prototype._writeNAL = function(data, nbElements, nalArray) {
    for (var i = 0; i < nbElements; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT16, nalArray[i].NAL_length);
        this._writeBuffer(data, nalArray[i].NAL, nalArray[i].NAL_length);
    }
};

mp4lib.boxes.PixelAspectRatioBox = function(size) {
    mp4lib.boxes.Box.call(this, "pasp", size);
};

mp4lib.boxes.PixelAspectRatioBox.prototype = Object.create(mp4lib.boxes.Box.prototype);

mp4lib.boxes.PixelAspectRatioBox.prototype.constructor = mp4lib.boxes.PixelAspectRatioBox;

mp4lib.boxes.PixelAspectRatioBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT32.getLength() * 2;
};

mp4lib.boxes.PixelAspectRatioBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.hSpacing = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.vSpacing = this._readData(data, mp4lib.fields.FIELD_INT32);
    return this.localPos;
};

mp4lib.boxes.PixelAspectRatioBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.hSpacing);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.vSpacing);
    return this.localPos;
};

mp4lib.boxes.AudioSampleEntryBox = function(boxType, size) {
    mp4lib.boxes.SampleEntryBox.call(this, boxType, size);
};

mp4lib.boxes.AudioSampleEntryBox.prototype = Object.create(mp4lib.boxes.SampleEntryBox.prototype);

mp4lib.boxes.AudioSampleEntryBox.prototype.constructor = mp4lib.boxes.AudioSampleEntryBox;

mp4lib.boxes.AudioSampleEntryBox.prototype.computeLength = function() {
    mp4lib.boxes.SampleEntryBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT16.getLength() * 4 + mp4lib.fields.FIELD_UINT32.getLength() * 3;
};

mp4lib.boxes.AudioSampleEntryBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.SampleEntryBox.prototype.read.call(this, data, pos, end);
    this.reserved_2 = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, 2);
    this.channelcount = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.samplesize = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.pre_defined = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.reserved_3 = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.samplerate = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.AudioSampleEntryBox.prototype.write = function(data, pos) {
    mp4lib.boxes.SampleEntryBox.prototype.write.call(this, data, pos);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT32, this.reserved_2);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.channelcount);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.samplesize);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.pre_defined);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.reserved_3);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.samplerate);
    return this.localPos;
};

mp4lib.boxes.AudioSampleEntryContainerBox = function(boxType, size) {
    mp4lib.boxes.AudioSampleEntryBox.call(this, boxType, size);
    this.boxes = [];
};

mp4lib.boxes.AudioSampleEntryContainerBox.prototype = Object.create(mp4lib.boxes.AudioSampleEntryBox.prototype);

mp4lib.boxes.AudioSampleEntryContainerBox.prototype.constructor = mp4lib.boxes.AudioSampleEntryContainerBox;

mp4lib.boxes.AudioSampleEntryContainerBox.prototype.computeLength = function() {
    mp4lib.boxes.AudioSampleEntryBox.prototype.computeLength.call(this);
    var i = 0;
    for (i = 0; i < this.boxes.length; i++) {
        this.boxes[i].computeLength();
        this.size += this.boxes[i].size;
    }
};

mp4lib.boxes.AudioSampleEntryContainerBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.AudioSampleEntryBox.prototype.read.call(this, data, pos, end);
    var size = 0, uuidFieldPos = 0, uuid = null, boxtype;
    while (this.localPos < this.localEnd) {
        size = mp4lib.fields.FIELD_UINT32.read(data, this.localPos);
        boxtype = mp4lib.fields.readString(data, this.localPos + 4, 4);
        if (boxtype == "uuid") {
            uuidFieldPos = size == 1 ? 16 : 8;
            uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(data, this.localPos + uuidFieldPos, this.localPos + uuidFieldPos + 16);
            uuid = JSON.stringify(uuid);
        }
        var box = mp4lib.createBox(boxtype, size, uuid);
        if (boxtype === "uuid") {
            this.localPos = box.read(data, this.localPos + mp4lib.fields.FIELD_INT8.getLength() * 16 + 8, this.localPos + size);
        } else {
            this.localPos = box.read(data, this.localPos + 8, this.localPos + size);
        }
        if (mp4lib.debug) box.__sourceBuffer = data.subarray(this.localPos - box.size, this.localPos);
        this.boxes.push(box);
        if (box.size <= 0 || box.size === null) {
            throw new mp4lib.ParseException("Problem on size of box " + box.boxtype + ", parsing stopped to avoid infinite loop");
        }
        if (!box.boxtype) {
            throw new mp4lib.ParseException("Problem on unknown box, parsing stopped to avoid infinite loop");
        }
    }
    return this.localPos;
};

mp4lib.boxes.AudioSampleEntryContainerBox.prototype.write = function(data, pos) {
    mp4lib.boxes.AudioSampleEntryBox.prototype.write.call(this, data, pos);
    for (var i = 0; i < this.boxes.length; i++) {
        this.localPos = this.boxes[i].write(data, this.localPos);
    }
    return this.localPos;
};

mp4lib.boxes.MP4AudioSampleEntryBox = function(size) {
    mp4lib.boxes.AudioSampleEntryContainerBox.call(this, "mp4a", size);
};

mp4lib.boxes.MP4AudioSampleEntryBox.prototype = Object.create(mp4lib.boxes.AudioSampleEntryContainerBox.prototype);

mp4lib.boxes.MP4AudioSampleEntryBox.prototype.constructor = mp4lib.boxes.MP4AudioSampleEntryBox;

mp4lib.boxes.EncryptedAudioBox = function(size) {
    mp4lib.boxes.AudioSampleEntryContainerBox.call(this, "enca", size);
};

mp4lib.boxes.EncryptedAudioBox.prototype = Object.create(mp4lib.boxes.AudioSampleEntryContainerBox.prototype);

mp4lib.boxes.EncryptedAudioBox.prototype.constructor = mp4lib.boxes.EncryptedAudioBox;

mp4lib.boxes.ESDBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "esds", size);
};

mp4lib.boxes.ESDBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.ESDBox.prototype.constructor = mp4lib.boxes.ESDBox;

mp4lib.boxes.ESDBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * 2 + this.ES_length;
};

mp4lib.boxes.ESDBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.ES_tag = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.ES_length = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.ES_data = data.subarray(this.localPos, this.localPos + this.ES_length);
    this.localPos += this.ES_length;
    return this.localPos;
};

mp4lib.boxes.ESDBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.ES_tag);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.ES_length);
    this._writeBuffer(data, this.ES_data, this.ES_length);
    return this.localPos;
};

mp4lib.boxes.SampleSizeBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "stsz", size);
};

mp4lib.boxes.SampleSizeBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.SampleSizeBox.prototype.constructor = mp4lib.boxes.SampleSizeBox;

mp4lib.boxes.SampleSizeBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2 + mp4lib.fields.FIELD_UINT32.getLength() * this.sample_count;
};

mp4lib.boxes.SampleSizeBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.sample_size = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.entries = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    return this.localPos;
};

mp4lib.boxes.SampleSizeBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_size);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    for (var i = 0; i < this.sample_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i]);
    }
    return this.localPos;
};

mp4lib.boxes.ProtectionSystemSpecificHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "pssh", size);
};

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype.constructor = mp4lib.boxes.ProtectionSystemSpecificHeaderBox;

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * 16;
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * this.DataSize;
};

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.SystemID = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, 16);
    this.DataSize = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.Data = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, this.DataSize);
    return this.localPos;
};

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;
    for (i = 0; i < 16; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT8, this.SystemID[i]);
    }
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.DataSize);
    for (i = 0; i < this.DataSize; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT8, this.Data[i]);
    }
    return this.localPos;
};

mp4lib.boxes.SampleAuxiliaryInformationSizesBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "saiz", size);
};

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype.constructor = mp4lib.boxes.SampleAuxiliaryInformationSizesBox;

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.flags & 1) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2;
    }
    this.size += mp4lib.fields.FIELD_UINT8.getLength() + mp4lib.fields.FIELD_UINT32.getLength();
    if (this.default_sample_info_size === 0) {
        this.size += mp4lib.fields.FIELD_UINT8.getLength() * this.sample_count;
    }
};

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    if (this.flags & 1) {
        this.aux_info_type = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.aux_info_type_parameter = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    this.default_sample_info_size = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if (this.default_sample_info_size === 0) {
        this.sample_info_size = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, this.sample_count);
    }
    return this.localPos;
};

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    if (this.flags & 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.aux_info_type);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.aux_info_type_parameter);
    }
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.default_sample_info_size);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    if (this.default_sample_info_size === 0) {
        for (var i = 0; i < this.sample_count; i++) {
            this._writeData(data, mp4lib.fields.FIELD_UINT8, this.sample_info_size[i]);
        }
    }
    return this.localPos;
};

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "saio", size);
};

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype.constructor = mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox;

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.flags & 1) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2;
    }
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    if (this.version === 0) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * this.entry_count;
    } else {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * this.entry_count;
    }
};

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    if (this.flags & 1) {
        this.aux_info_type = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.aux_info_type_parameter = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if (this.version === 0) {
        this.offset = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    } else {
        this.offset = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT64, this.entry_count);
    }
    return this.localPos;
};

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;
    if (this.flags & 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.aux_info_type);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.aux_info_type_parameter);
    }
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    if (this.version === 0) {
        for (i = 0; i < this.entry_count; i++) {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.offset[i]);
        }
    } else {
        for (i = 0; i < this.entry_count; i++) {
            this._writeData(data, mp4lib.fields.FIELD_UINT64, this.offset[i]);
        }
    }
    return this.localPos;
};

mp4lib.boxes.ProtectionSchemeInformationBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "sinf", size);
};

mp4lib.boxes.ProtectionSchemeInformationBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.ProtectionSchemeInformationBox.prototype.constructor = mp4lib.boxes.ProtectionSchemeInformationBox;

mp4lib.boxes.SchemeInformationBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, "schi", size);
};

mp4lib.boxes.SchemeInformationBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);

mp4lib.boxes.SchemeInformationBox.prototype.constructor = mp4lib.boxes.SchemeInformationBox;

mp4lib.boxes.TrackEncryptionBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "tenc", size);
};

mp4lib.boxes.TrackEncryptionBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.TrackEncryptionBox.prototype.constructor = mp4lib.boxes.TrackEncryptionBox;

mp4lib.boxes.TrackEncryptionBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_BIT24.getLength();
    this.size += mp4lib.fields.FIELD_UINT8.getLength();
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * 16;
};

mp4lib.boxes.TrackEncryptionBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.default_IsEncrypted = this._readData(data, mp4lib.fields.FIELD_BIT24);
    this.default_IV_size = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.default_KID = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, 16);
    return this.localPos;
};

mp4lib.boxes.TrackEncryptionBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_BIT24, this.default_IsEncrypted);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.default_IV_size);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT8, this.default_KID);
    return this.localPos;
};

mp4lib.boxes.SchemeTypeBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "schm", size);
};

mp4lib.boxes.SchemeTypeBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.SchemeTypeBox.prototype.constructor = mp4lib.boxes.SchemeTypeBox;

mp4lib.boxes.SchemeTypeBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2;
    if (this.flags & 1) {
        this.size += mp4lib.fields.FIELD_STRING.getLength(this.scheme_uri);
    }
};

mp4lib.boxes.SchemeTypeBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.scheme_type = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.scheme_version = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if (this.flags & 1) {
        this.scheme_uri = this._readData(data, mp4lib.fields.FIELD_STRING);
    }
    return this.localPos;
};

mp4lib.boxes.SchemeTypeBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.scheme_type);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.scheme_version);
    if (this.flags & 1) {
        this._writeData(data, mp4lib.fields.FIELD_STRING, this.scheme_uri);
    }
    return this.localPos;
};

mp4lib.boxes.EditListBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "elst", size);
    this.entries = [];
};

mp4lib.boxes.EditListBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.EditListBox.prototype.constructor = mp4lib.boxes.EditListBox;

mp4lib.boxes.EditListBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    if (this.version === 1) {
        this.size += (mp4lib.fields.FIELD_UINT64.getLength() * 2 + mp4lib.fields.FIELD_UINT16.getLength() * 2) * this.entry_count;
    } else {
        this.size += (mp4lib.fields.FIELD_UINT32.getLength() * 2 + mp4lib.fields.FIELD_UINT16.getLength() * 2) * this.entry_count;
    }
};

mp4lib.boxes.EditListBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    for (var i = 0; i < this.entry_count; i++) {
        var struct = {};
        if (this.version === 1) {
            struct.segment_duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
            struct.media_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        } else {
            struct.segment_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
            struct.media_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        }
        struct.media_rate_integer = this._readData(data, mp4lib.fields.FIELD_UINT16);
        struct.media_rate_fraction = this._readData(data, mp4lib.fields.FIELD_UINT16);
        this.entries.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.EditListBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    for (var i = 0; i < this.entry_count; i++) {
        if (this.version === 1) {
            this._writeData(data, mp4lib.fields.FIELD_UINT64, this.entries[i].segment_duration);
            this._writeData(data, mp4lib.fields.FIELD_UINT64, this.entries[i].media_time);
        } else {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].segment_duration);
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].media_time);
        }
        this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entries[i].media_rate_integer);
        this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entries[i].media_rate_fraction);
    }
    return this.localPos;
};

mp4lib.boxes.HintMediaHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "hmhd", size);
};

mp4lib.boxes.HintMediaHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.HintMediaHeaderBox.prototype.constructor = mp4lib.boxes.HintMediaHeaderBox;

mp4lib.boxes.HintMediaHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT16.getLength() * 2;
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 3;
};

mp4lib.boxes.HintMediaHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.maxPDUsize = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.avgPDUsize = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.maxbitrate = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.avgbitrate = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.reserved = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.HintMediaHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.maxPDUsize);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.avgPDUsize);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.maxbitrate);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.avgbitrate);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.reserved);
    return this.localPos;
};

mp4lib.boxes.NullMediaHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "nmhd", size);
};

mp4lib.boxes.NullMediaHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.NullMediaHeaderBox.prototype.constructor = mp4lib.boxes.NullMediaHeaderBox;

mp4lib.boxes.CompositionOffsetBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "ctts", size);
    this.entries = [];
};

mp4lib.boxes.CompositionOffsetBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.CompositionOffsetBox.prototype.constructor = mp4lib.boxes.CompositionOffsetBox;

mp4lib.boxes.CompositionOffsetBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    if (this.version === 0) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2 * this.entry_count;
    } else {
        this.size += (mp4lib.fields.FIELD_UINT32.getLength() + mp4lib.fields.FIELD_INT32.getLength()) * this.entry_count;
    }
};

mp4lib.boxes.CompositionOffsetBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    for (var i = 0; i < this.entry_count; i++) {
        var struct = {};
        if (this.version === 0) {
            struct.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
            struct.sample_offset = this._readData(data, mp4lib.fields.FIELD_UINT32);
        } else {
            struct.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
            struct.sample_offset = this._readData(data, mp4lib.fields.FIELD_INT32);
        }
        this.entries.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.CompositionOffsetBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    for (var i = 0; i < this.entry_count; i++) {
        if (this.version === 0) {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].sample_count);
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].sample_offset);
        } else {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].sample_count);
            this._writeData(data, mp4lib.fields.FIELD_INT32, this.entries[i].sample_offset);
        }
    }
    return this.localPos;
};

mp4lib.boxes.CompositionToDecodeBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "cslg", size);
};

mp4lib.boxes.CompositionToDecodeBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.CompositionToDecodeBox.prototype.constructor = mp4lib.boxes.CompositionToDecodeBox;

mp4lib.boxes.CompositionToDecodeBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT32.getLength() * 5;
};

mp4lib.boxes.CompositionToDecodeBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.compositionToDTSShift = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.leastDecodeToDisplayDelta = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.greatestDecodeToDisplayDelta = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.compositionStartTime = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.compositionEndTime = this._readData(data, mp4lib.fields.FIELD_INT32);
    return this.localPos;
};

mp4lib.boxes.CompositionToDecodeBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.compositionToDTSShift);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.leastDecodeToDisplayDelta);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.greatestDecodeToDisplayDelta);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.compositionStartTime);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.compositionEndTime);
    return this.localPos;
};

mp4lib.boxes.SyncSampleBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "stss", size);
    this.entries = [];
};

mp4lib.boxes.SyncSampleBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.SyncSampleBox.prototype.constructor = mp4lib.boxes.SyncSampleBox;

mp4lib.boxes.SyncSampleBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * this.entry_count;
};

mp4lib.boxes.SyncSampleBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    for (var i = 0; i < this.entry_count; i++) {
        var struct = {};
        struct.sample_number = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.entries.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.SyncSampleBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    for (var i = 0; i < this.entry_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].sample_number);
    }
    return this.localPos;
};

mp4lib.boxes.TrackReferenceBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "tref", size);
};

mp4lib.boxes.TrackReferenceBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.TrackReferenceBox.prototype.constructor = mp4lib.boxes.TrackReferenceBox;

mp4lib.boxes.TrackReferenceBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * this.track_IDs.length;
};

mp4lib.boxes.TrackReferenceBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.track_IDs = this._readArrayData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.TrackReferenceBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT32, this.track_IDs);
    return this.localPos;
};

mp4lib.boxes.OriginalFormatBox = function(size) {
    mp4lib.boxes.Box.call(this, "frma", size);
};

mp4lib.boxes.OriginalFormatBox.prototype = Object.create(mp4lib.boxes.Box.prototype);

mp4lib.boxes.OriginalFormatBox.prototype.constructor = mp4lib.boxes.OriginalFormatBox;

mp4lib.boxes.OriginalFormatBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
};

mp4lib.boxes.OriginalFormatBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.data_format = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.OriginalFormatBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.data_format);
    return this.localPos;
};

mp4lib.boxes.PiffSampleEncryptionBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "sepiff", size, [ 162, 57, 79, 82, 90, 155, 79, 20, 162, 68, 108, 66, 124, 100, 141, 244 ]);
};

mp4lib.boxes.PiffSampleEncryptionBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.PiffSampleEncryptionBox.prototype.constructor = mp4lib.boxes.PiffSampleEncryptionBox;

mp4lib.boxes.PiffSampleEncryptionBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    var i = 0, j = 0;
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    if (this.flags & 1) {
        this.size += mp4lib.fields.FIELD_UINT8.getLength();
    }
    for (i = 0; i < this.sample_count; i++) {
        this.size += 8;
        if (this.flags & 2) {
            this.size += mp4lib.fields.FIELD_UINT16.getLength();
            for (j = 0; j < this.entry[i].NumberOfEntries; j++) {
                this.size += mp4lib.fields.FIELD_UINT16.getLength();
                this.size += mp4lib.fields.FIELD_UINT32.getLength();
            }
        }
    }
};

mp4lib.boxes.PiffSampleEncryptionBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    if (this.flags & 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT8, this.IV_size);
    }
    for (var i = 0; i < this.sample_count; i++) {
        this._writeBuffer(data, this.entry[i].InitializationVector, 8);
        if (this.flags & 2) {
            this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entry[i].NumberOfEntries);
            for (var j = 0; j < this.entry[i].NumberOfEntries; j++) {
                this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entry[i].clearAndCryptedData[j].BytesOfClearData);
                this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].clearAndCryptedData[j].BytesOfEncryptedData);
            }
        }
    }
    return this.localPos;
};

mp4lib.boxes.PiffSampleEncryptionBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if (this.flags & 1) {
        this.IV_size = this._readData(data, mp4lib.fields.FIELD_UINT8);
    }
    this.entry = [];
    for (var i = 0; i < this.sample_count; i++) {
        var struct = {};
        struct.InitializationVector = data.subarray(this.localPos, this.localPos + 8);
        this.localPos += 8;
        if (this.flags & 2) {
            struct.NumberOfEntries = this._readData(data, mp4lib.fields.FIELD_UINT16);
            struct.clearAndCryptedData = [];
            for (var j = 0; j < struct.NumberOfEntries; j++) {
                var clearAndCryptedStruct = {};
                clearAndCryptedStruct.BytesOfClearData = this._readData(data, mp4lib.fields.FIELD_UINT16);
                clearAndCryptedStruct.BytesOfEncryptedData = this._readData(data, mp4lib.fields.FIELD_UINT32);
                struct.clearAndCryptedData.push(clearAndCryptedStruct);
            }
        }
        this.entry.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.PiffTrackEncryptionBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "tepiff", size, [ 137, 116, 219, 206, 123, 231, 76, 81, 132, 249, 113, 72, 249, 136, 37, 84 ]);
};

mp4lib.boxes.PiffTrackEncryptionBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.PiffTrackEncryptionBox.prototype.constructor = mp4lib.boxes.PiffTrackEncryptionBox;

mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "psshpiff", size, [ 208, 138, 79, 24, 16, 243, 74, 130, 182, 200, 50, 216, 171, 161, 131, 211 ]);
};

mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox.prototype.constructor = mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox;

mp4lib.boxes.TfxdBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "tfxd", size, [ 109, 29, 155, 5, 66, 213, 68, 230, 128, 226, 20, 29, 175, 247, 87, 178 ]);
};

mp4lib.boxes.TfxdBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.TfxdBox.prototype.constructor = mp4lib.boxes.TfxdBox;

mp4lib.boxes.TfxdBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.version === 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 2;
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2;
    }
};

mp4lib.boxes.TfxdBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.fragment_absolute_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.fragment_duration);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.fragment_absolute_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.fragment_duration);
    }
    return this.localPos;
};

mp4lib.boxes.TfxdBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    if (this.version === 1) {
        this.fragment_absolute_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.fragment_absolute_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    return this.localPos;
};

mp4lib.boxes.TfrfBox = function(size) {
    mp4lib.boxes.FullBox.call(this, "tfrf", size, [ 212, 128, 126, 242, 202, 57, 70, 149, 142, 84, 38, 203, 158, 70, 167, 159 ]);
};

mp4lib.boxes.TfrfBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);

mp4lib.boxes.TfrfBox.prototype.constructor = mp4lib.boxes.TfrfBox;

mp4lib.boxes.TfrfBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT8.getLength();
    if (this.version === 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 2 * this.fragment_count;
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2 * this.fragment_count;
    }
};

mp4lib.boxes.TfrfBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.fragment_count);
    for (var i = 0; i < this.fragment_count; i++) {
        if (this.version === 1) {
            this._writeData(data, mp4lib.fields.FIELD_UINT64, this.entry[i].fragment_absolute_time);
            this._writeData(data, mp4lib.fields.FIELD_UINT64, this.entry[i].fragment_duration);
        } else {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].fragment_absolute_time);
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].fragment_duration);
        }
    }
    return this.localPos;
};

mp4lib.boxes.TfrfBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.fragment_count = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.entry = [];
    for (var i = 0; i < this.fragment_count; i++) {
        var struct = {};
        if (this.version === 1) {
            struct.fragment_absolute_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
            struct.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
        } else {
            struct.fragment_absolute_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
            struct.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
        }
        this.entry.push(struct);
    }
    return this.localPos;
};

mp4lib.registerTypeBoxes();

mp4lib.fields.readBytes = function(buf, pos, nbBytes) {
    var value = 0;
    for (var i = 0; i < nbBytes; i++) {
        value = value << 8;
        value = value + buf[pos];
        pos++;
    }
    return value;
};

mp4lib.fields.writeBytes = function(buf, pos, nbBytes, value) {
    for (var i = 0; i < nbBytes; i++) {
        buf[pos + nbBytes - i - 1] = value & 255;
        value = value >> 8;
    }
};

mp4lib.fields.readString = function(buf, pos, count) {
    var res = "";
    for (var i = pos; i < pos + count; i++) {
        res += String.fromCharCode(buf[i]);
    }
    return res;
};

mp4lib.fields.NumberField = function(bits, signed) {
    this.bits = bits;
    this.signed = signed;
};

mp4lib.fields.NumberField.prototype.read = function(buf, pos) {
    return mp4lib.fields.readBytes(buf, pos, this.bits / 8);
};

mp4lib.fields.NumberField.prototype.write = function(buf, pos, val) {
    mp4lib.fields.writeBytes(buf, pos, this.bits / 8, val);
};

mp4lib.fields.NumberField.prototype.getLength = function() {
    return this.bits / 8;
};

mp4lib.fields.LongNumberField = function() {};

mp4lib.fields.LongNumberField.prototype.read = function(buf, pos) {
    var high = mp4lib.fields.readBytes(buf, pos, 4);
    var low = mp4lib.fields.readBytes(buf, pos + 4, 4);
    return goog.math.Long.fromBits(low, high).toNumber();
};

mp4lib.fields.LongNumberField.prototype.write = function(buf, pos, val) {
    var longNumber = goog.math.Long.fromNumber(val);
    var low = longNumber.getLowBits();
    var high = longNumber.getHighBits();
    mp4lib.fields.writeBytes(buf, pos, 4, high);
    mp4lib.fields.writeBytes(buf, pos + 4, 4, low);
};

mp4lib.fields.LongNumberField.prototype.getLength = function() {
    return 8;
};

mp4lib.fields.FixedLenStringField = function(size) {
    this.size = size;
};

mp4lib.fields.FixedLenStringField.prototype.read = function(buf, pos) {
    var res = "";
    for (var i = 0; i < this.size; i++) {
        res = res + String.fromCharCode(buf[pos + i]);
    }
    return res;
};

mp4lib.fields.FixedLenStringField.prototype.write = function(buf, pos, val) {
    for (var i = 0; i < this.size; i++) {
        buf[pos + i] = val.charCodeAt(i);
    }
};

mp4lib.fields.FixedLenStringField.prototype.getLength = function() {
    return this.size;
};

mp4lib.fields.BoxTypeField = function() {};

mp4lib.fields.BoxTypeField.prototype.read = function(buf, pos) {
    var res = "";
    for (var i = 0; i < 4; i++) {
        res = res + String.fromCharCode(buf[pos + i]);
    }
    return res;
};

mp4lib.fields.BoxTypeField.prototype.write = function(buf, pos, val) {
    for (var i = 0; i < 4; i++) {
        buf[pos + i] = val.charCodeAt(i);
    }
};

mp4lib.fields.BoxTypeField.prototype.getLength = function() {
    return 4;
};

mp4lib.fields.StringField = function() {};

mp4lib.fields.StringField.prototype.read = function(buf, pos, end) {
    var res = "";
    for (var i = pos; i < end; i++) {
        res = res + String.fromCharCode(buf[i]);
        if (buf[i] === 0) {
            return res;
        }
    }
    if (end - pos < 255 && buf[0] == String.fromCharCode(end - pos)) {
        res = res.substr(1, end - pos);
        mp4lib.warningHandler("null-terminated string expected, " + 'but found a string "' + res + '", which seems to be ' + "length-prefixed instead. Conversion done.");
        return res;
    }
    throw new mp4lib.ParseException("expected null-terminated string, " + "but end of field reached without termination. " + 'Read so far:"' + res + '"');
};

mp4lib.fields.StringField.prototype.write = function(buf, pos, val) {
    for (var i = 0; i < val.length; i++) {
        buf[pos + i] = val.charCodeAt(i);
    }
    buf[pos + val.length] = 0;
};

mp4lib.fields.StringField.prototype.getLength = function(val) {
    return val.length;
};

mp4lib.fields.ArrayField = function(innerField, size) {
    this.innerField = innerField;
    this.size = size;
};

mp4lib.fields.ArrayField.prototype.read = function(buf, pos) {
    var innerFieldLength = -1;
    var res = [];
    for (var i = 0; i < this.size; i++) {
        res.push(this.innerField.read(buf, pos));
        if (innerFieldLength == -1) innerFieldLength = this.innerField.getLength(res[i]);
        pos += innerFieldLength;
    }
    return res;
};

mp4lib.fields.FIELD_INT8 = new mp4lib.fields.NumberField(8, true);

mp4lib.fields.FIELD_INT16 = new mp4lib.fields.NumberField(16, true);

mp4lib.fields.FIELD_INT32 = new mp4lib.fields.NumberField(32, true);

mp4lib.fields.FIELD_INT64 = new mp4lib.fields.LongNumberField();

mp4lib.fields.FIELD_UINT8 = new mp4lib.fields.NumberField(8, false);

mp4lib.fields.FIELD_UINT16 = new mp4lib.fields.NumberField(16, false);

mp4lib.fields.FIELD_UINT32 = new mp4lib.fields.NumberField(32, false);

mp4lib.fields.FIELD_UINT64 = new mp4lib.fields.LongNumberField();

mp4lib.fields.FIELD_BIT8 = new mp4lib.fields.NumberField(8, false);

mp4lib.fields.FIELD_BIT16 = new mp4lib.fields.NumberField(16, false);

mp4lib.fields.FIELD_BIT24 = new mp4lib.fields.NumberField(24, false);

mp4lib.fields.FIELD_BIT32 = new mp4lib.fields.NumberField(32, false);

mp4lib.fields.FIELD_ID = new mp4lib.fields.BoxTypeField(4);

mp4lib.fields.FIELD_STRING = new mp4lib.fields.StringField();

MediaPlayer = function(aContext) {
    "use strict";
    var VERSION = "1.2.0", VERSION_HAS = "1.2.0_dev", GIT_TAG = "@@REVISION", BUILD_DATE = "@@TIMESTAMP", context = aContext, system, element, source, sourceParams, streamController, videoModel, initialized = false, playing = false, autoPlay = true, scheduleWhilePaused = false, bufferMax = MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED, isReady = function() {
        return !!element && !!source;
    }, play = function() {
        if (!initialized) {
            throw "MediaPlayer not initialized!";
        }
        if (!this.capabilities.supportsMediaSource()) {
            this.errHandler.capabilityError("mediasource");
            return;
        }
        if (!element || !source) {
            throw "Missing view or source.";
        }
        playing = true;
        streamController = system.getObject("streamController");
        streamController.setVideoModel(videoModel);
        streamController.setAutoPlay(autoPlay);
        streamController.load(source, sourceParams);
        system.mapValue("scheduleWhilePaused", scheduleWhilePaused);
        system.mapOutlet("scheduleWhilePaused", "stream");
        system.mapOutlet("scheduleWhilePaused", "bufferController");
        system.mapValue("bufferMax", bufferMax);
        system.injectInto(this.bufferExt, "bufferMax");
    }, doAutoPlay = function() {
        if (isReady()) {
            play.call(this);
        }
    }, getDVRInfoMetric = function() {
        var metric = this.metricsModel.getReadOnlyMetricsFor("video") || this.metricsModel.getReadOnlyMetricsFor("audio");
        return this.metricsExt.getCurrentDVRInfo(metric);
    }, getDVRWindowSize = function() {
        return getDVRInfoMetric.call(this).mpd.timeShiftBufferDepth;
    }, getDVRSeekOffset = function(value) {
        var metric = getDVRInfoMetric.call(this), val = metric.range.start + parseInt(value, 10);
        if (val > metric.range.end) {
            val = metric.range.end;
        }
        return val;
    }, seek = function(value) {
        videoModel.getElement().currentTime = this.getDVRSeekOffset(value);
    }, time = function() {
        var metric = getDVRInfoMetric.call(this);
        return metric === null ? 0 : Math.round(this.duration() - (metric.range.end - metric.time));
    }, duration = function() {
        var metric = getDVRInfoMetric.call(this), range;
        if (metric === null) {
            return 0;
        }
        range = metric.range.end - metric.range.start;
        return Math.round(range < metric.mpd.timeShiftBufferDepth ? range : metric.mpd.timeShiftBufferDepth);
    }, timeAsUTC = function() {
        var metric = getDVRInfoMetric.call(this), availabilityStartTime, currentUTCTime;
        if (metric === null) {
            return 0;
        }
        availabilityStartTime = metric.mpd.availabilityStartTime.getTime() / 1e3;
        currentUTCTime = this.time() + (availabilityStartTime + metric.range.start);
        return Math.round(currentUTCTime);
    }, durationAsUTC = function() {
        var metric = getDVRInfoMetric.call(this), availabilityStartTime, currentUTCDuration;
        if (metric === null) {
            return 0;
        }
        availabilityStartTime = metric.mpd.availabilityStartTime.getTime() / 1e3;
        currentUTCDuration = availabilityStartTime + metric.range.start + this.duration();
        return Math.round(currentUTCDuration);
    }, formatUTC = function(time, locales, hour12) {
        var dt = new Date(time * 1e3);
        var d = dt.toLocaleDateString(locales);
        var t = dt.toLocaleTimeString(locales, {
            hour12: hour12
        });
        return t + " " + d;
    }, convertToTimeCode = function(value) {
        value = Math.max(value, 0);
        var h = Math.floor(value / 3600);
        var m = Math.floor(value % 3600 / 60);
        var s = Math.floor(value % 3600 % 60);
        return (h === 0 ? "" : h < 10 ? "0" + h.toString() + ":" : h.toString() + ":") + (m < 10 ? "0" + m.toString() : m.toString()) + ":" + (s < 10 ? "0" + s.toString() : s.toString());
    };
    system = new dijon.System();
    system.mapValue("system", system);
    system.mapOutlet("system");
    system.injectInto(context);
    return {
        notifier: undefined,
        debug: undefined,
        eventBus: undefined,
        capabilities: undefined,
        abrController: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        bufferExt: undefined,
        errHandler: undefined,
        tokenAuthentication: undefined,
        uriQueryFragModel: undefined,
        config: undefined,
        addEventListener: function(type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
        },
        removeEventListener: function(type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        },
        getVersion: function() {
            return VERSION;
        },
        getVersionHAS: function() {
            return VERSION_HAS;
        },
        getVersionFull: function() {
            if (GIT_TAG.indexOf("@@") === -1) {
                return VERSION_HAS + "_" + GIT_TAG;
            } else {
                return VERSION_HAS;
            }
        },
        getBuildDate: function() {
            if (BUILD_DATE.indexOf("@@") === -1) {
                return BUILD_DATE;
            } else {
                return "Not a builded version";
            }
        },
        startup: function() {
            if (!initialized) {
                system.injectInto(this);
                initialized = true;
                this.debug.log("[MediaPlayer] Version: " + this.getVersionFull() + " - " + this.getBuildDate());
                this.debug.log("[MediaPlayer] user-agent: " + navigator.userAgent);
            }
        },
        getDebug: function() {
            return this.debug;
        },
        getVideoModel: function() {
            return videoModel;
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        setScheduleWhilePaused: function(value) {
            scheduleWhilePaused = value;
        },
        getScheduleWhilePaused: function() {
            return scheduleWhilePaused;
        },
        setTokenAuthentication: function(name, type) {
            this.tokenAuthentication.setTokenAuthentication({
                name: name,
                type: type
            });
        },
        setBufferMax: function(value) {
            bufferMax = value;
        },
        getBufferMax: function() {
            return bufferMax;
        },
        getMetricsExt: function() {
            return this.metricsExt;
        },
        getMetricsFor: function(type) {
            var metrics = this.metricsModel.getReadOnlyMetricsFor(type);
            return metrics;
        },
        getQualityFor: function(type) {
            return this.abrController.getQualityFor(type);
        },
        setQualityFor: function(type, value) {
            this.abrController.setPlaybackQuality(type, value);
        },
        getAutoSwitchQuality: function() {
            return this.abrController.getAutoSwitchBitrate();
        },
        setAutoSwitchQuality: function(value) {
            this.abrController.setAutoSwitchBitrate(value);
        },
        setConfig: function(params) {
            if (this.config && params) {
                this.debug.log("[MediaPlayer] set config: " + JSON.stringify(params, null, "	"));
                this.config.setParams(params);
                this.debug.setLevel(this.config.getParam("Debug.level", "number", this.debug.ALL));
            }
        },
        setAudioTrack: function(audioTrack) {
            streamController.setAudioTrack(audioTrack);
        },
        getAudioTracks: function() {
            return streamController.getAudioTracks();
        },
        setSubtitleTrack: function(subtitleTrack) {
            streamController.setSubtitleTrack(subtitleTrack);
        },
        getSubtitleTracks: function() {
            return streamController.getSubtitleTracks();
        },
        attachView: function(view) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }
            element = view;
            videoModel = null;
            if (element) {
                videoModel = system.getObject("videoModel");
                videoModel.setElement(element);
            }
            if (playing && streamController) {
                streamController.reset();
                streamController = null;
                playing = false;
            }
            if (isReady.call(this)) {
                doAutoPlay.call(this);
            }
        },
        attachSource: function(url, params) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }
            var loop = this.getVideoModel().getElement().loop;
            this.metricsModel.addSession(null, url, loop, null, "HasPlayer.js_" + this.getVersionHAS());
            this.uriQueryFragModel.reset();
            if (url) {
                source = this.uriQueryFragModel.parseURI(url);
            } else {
                source = null;
            }
            sourceParams = params;
            if (playing && streamController) {
                streamController.reset();
                streamController = null;
                playing = false;
            }
            if (isReady.call(this)) {
                doAutoPlay.call(this);
            }
        },
        reset: function() {
            this.attachSource(null);
            this.attachView(null);
        },
        play: play,
        isReady: isReady,
        seek: seek,
        time: time,
        duration: duration,
        timeAsUTC: timeAsUTC,
        durationAsUTC: durationAsUTC,
        getDVRWindowSize: getDVRWindowSize,
        getDVRSeekOffset: getDVRSeekOffset,
        formatUTC: formatUTC,
        convertToTimeCode: convertToTimeCode
    };
};

MediaPlayer.prototype = {
    constructor: MediaPlayer
};

MediaPlayer.dependencies = {};

MediaPlayer.dependencies.protection = {};

MediaPlayer.utils = {};

MediaPlayer.models = {};

MediaPlayer.vo = {};

MediaPlayer.vo.metrics = {};

MediaPlayer.rules = {};

MediaPlayer.di = {};

MediaPlayer.vo.protection = {};

MediaPlayer.di.Context = function() {
    "use strict";
    var mapProtectionModel = function() {
        var videoElement = document.createElement("video");
        if (MediaPlayer.models.ProtectionModel_21Jan2015.detect(videoElement)) {
            this.system.mapClass("protectionModel", MediaPlayer.models.ProtectionModel_21Jan2015);
        } else if (MediaPlayer.models.ProtectionModel_3Feb2014.detect(videoElement)) {
            this.system.mapClass("protectionModel", MediaPlayer.models.ProtectionModel_3Feb2014);
        } else if (MediaPlayer.models.ProtectionModel_01b.detect(videoElement)) {
            this.system.mapClass("protectionModel", MediaPlayer.models.ProtectionModel_01b);
        } else {
            var debug = this.system.getObject("debug");
            debug.log("No supported version of EME detected on this user agent!");
            debug.log("Attempts to play encrypted content will fail!");
        }
    };
    return {
        system: undefined,
        setup: function() {
            this.system.autoMapOutlets = true;
            this.system.mapSingleton("debug", MediaPlayer.utils.Debug);
            this.system.mapSingleton("tokenAuthentication", MediaPlayer.utils.TokenAuthentication);
            this.system.mapSingleton("eventBus", MediaPlayer.utils.EventBus);
            this.system.mapSingleton("capabilities", MediaPlayer.utils.Capabilities);
            this.system.mapSingleton("textTrackExtensions", MediaPlayer.utils.TextTrackExtensions);
            this.system.mapSingleton("vttParser", MediaPlayer.utils.VTTParser);
            this.system.mapSingleton("ttmlParser", MediaPlayer.utils.TTMLParser);
            mapProtectionModel.call(this);
            this.system.mapClass("videoModel", MediaPlayer.models.VideoModel);
            this.system.mapSingleton("manifestModel", MediaPlayer.models.ManifestModel);
            this.system.mapSingleton("metricsModel", MediaPlayer.models.MetricsModel);
            this.system.mapSingleton("uriQueryFragModel", MediaPlayer.models.URIQueryAndFragmentModel);
            this.system.mapSingleton("textSourceBuffer", MediaPlayer.dependencies.TextSourceBuffer);
            this.system.mapSingleton("textTTMLXMLMP4SourceBuffer", MediaPlayer.dependencies.TextTTMLXMLMP4SourceBuffer);
            this.system.mapSingleton("mediaSourceExt", MediaPlayer.dependencies.MediaSourceExtensions);
            this.system.mapSingleton("sourceBufferExt", MediaPlayer.dependencies.SourceBufferExtensions);
            this.system.mapSingleton("bufferExt", MediaPlayer.dependencies.BufferExtensions);
            this.system.mapSingleton("abrController", MediaPlayer.dependencies.AbrController);
            this.system.mapSingleton("errHandler", MediaPlayer.dependencies.ErrorHandler);
            this.system.mapSingleton("protectionExt", MediaPlayer.dependencies.ProtectionExtensions);
            this.system.mapSingleton("videoExt", MediaPlayer.dependencies.VideoModelExtensions);
            this.system.mapClass("protectionController", MediaPlayer.dependencies.ProtectionController);
            this.system.mapSingleton("ksPlayReady", MediaPlayer.dependencies.protection.KeySystem_PlayReady);
            this.system.mapSingleton("ksWidevine", MediaPlayer.dependencies.protection.KeySystem_Widevine);
            this.system.mapSingleton("ksClearKey", MediaPlayer.dependencies.protection.KeySystem_ClearKey);
            this.system.mapClass("metrics", MediaPlayer.models.MetricsList);
            this.system.mapClass("downloadRatioRule", MediaPlayer.rules.DownloadRatioRule);
            this.system.mapClass("insufficientBufferRule", MediaPlayer.rules.InsufficientBufferRule);
            this.system.mapClass("limitSwitchesRule", MediaPlayer.rules.LimitSwitchesRule);
            this.system.mapClass("abrRulesCollection", MediaPlayer.rules.BaseRulesCollection);
            this.system.mapClass("eventController", MediaPlayer.dependencies.EventController);
            this.system.mapClass("textController", MediaPlayer.dependencies.TextController);
            this.system.mapClass("bufferController", MediaPlayer.dependencies.BufferController);
            this.system.mapClass("manifestLoader", MediaPlayer.dependencies.ManifestLoader);
            this.system.mapSingleton("manifestUpdater", MediaPlayer.dependencies.ManifestUpdater);
            this.system.mapClass("fragmentController", MediaPlayer.dependencies.FragmentController);
            this.system.mapClass("fragmentLoader", MediaPlayer.dependencies.FragmentLoader);
            this.system.mapClass("fragmentModel", MediaPlayer.dependencies.FragmentModel);
            this.system.mapSingleton("streamController", MediaPlayer.dependencies.StreamController);
            this.system.mapClass("stream", MediaPlayer.dependencies.Stream);
            this.system.mapClass("requestScheduler", MediaPlayer.dependencies.RequestScheduler);
            this.system.mapSingleton("schedulerExt", MediaPlayer.dependencies.SchedulerExtensions);
            this.system.mapClass("schedulerModel", MediaPlayer.dependencies.SchedulerModel);
            this.system.mapSingleton("notifier", MediaPlayer.dependencies.Notifier);
        }
    };
};

Dash = function() {
    "use strict";
    return {
        modules: {},
        dependencies: {},
        vo: {},
        di: {}
    };
}();

Dash.di.DashContext = function() {
    "use strict";
    return {
        system: undefined,
        setup: function() {
            Dash.di.DashContext.prototype.setup.call(this);
            this.system.mapClass("parser", Dash.dependencies.DashParser);
            this.system.mapClass("indexHandler", Dash.dependencies.DashHandler);
            this.system.mapClass("baseURLExt", Dash.dependencies.BaseURLExtensions);
            this.system.mapClass("fragmentExt", Dash.dependencies.FragmentExtensions);
            this.system.mapSingleton("manifestExt", Dash.dependencies.DashManifestExtensions);
            this.system.mapSingleton("metricsExt", Dash.dependencies.DashMetricsExtensions);
            this.system.mapSingleton("timelineConverter", Dash.dependencies.TimelineConverter);
        }
    };
};

Dash.di.DashContext.prototype = new MediaPlayer.di.Context();

Dash.di.DashContext.prototype.constructor = Dash.di.DashContext;

Dash.dependencies.BaseURLExtensions = function() {
    "use strict";
    var parseSIDX = function(ab, ab_first_byte_offset) {
        var d = new DataView(ab), sidx = {}, pos = 0, offset, time, sidxEnd, i, ref_type, ref_size, ref_dur, type, size, charCode;
        while (type !== "sidx" && pos < d.byteLength) {
            size = d.getUint32(pos);
            pos += 4;
            type = "";
            for (i = 0; i < 4; i += 1) {
                charCode = d.getInt8(pos);
                type += String.fromCharCode(charCode);
                pos += 1;
            }
            if (type !== "moof" && type !== "traf" && type !== "sidx") {
                pos += size - 8;
            } else if (type === "sidx") {
                pos -= 8;
            }
        }
        sidxEnd = d.getUint32(pos, false) + pos;
        if (sidxEnd > ab.byteLength) {
            throw "sidx terminates after array buffer";
        }
        sidx.version = d.getUint8(pos + 8);
        pos += 12;
        sidx.timescale = d.getUint32(pos + 4, false);
        pos += 8;
        if (sidx.version === 0) {
            sidx.earliest_presentation_time = d.getUint32(pos, false);
            sidx.first_offset = d.getUint32(pos + 4, false);
            pos += 8;
        } else {
            sidx.earliest_presentation_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
            sidx.first_offset = (d.getUint32(pos + 8, false) << 32) + d.getUint32(pos + 12, false);
            pos += 16;
        }
        sidx.first_offset += sidxEnd + (ab_first_byte_offset || 0);
        sidx.reference_count = d.getUint16(pos + 2, false);
        pos += 4;
        sidx.references = [];
        offset = sidx.first_offset;
        time = sidx.earliest_presentation_time;
        for (i = 0; i < sidx.reference_count; i += 1) {
            ref_size = d.getUint32(pos, false);
            ref_type = ref_size >>> 31;
            ref_size = ref_size & 2147483647;
            ref_dur = d.getUint32(pos + 4, false);
            pos += 12;
            sidx.references.push({
                size: ref_size,
                type: ref_type,
                offset: offset,
                duration: ref_dur,
                time: time,
                timescale: sidx.timescale
            });
            offset += ref_size;
            time += ref_dur;
        }
        if (pos !== sidxEnd) {
            throw "Error: final pos " + pos + " differs from SIDX end " + sidxEnd;
        }
        return sidx;
    }, parseSegments = function(data, media, offset) {
        var parsed, ref, segments, segment, i, len, start, end;
        parsed = parseSIDX.call(this, data, offset);
        ref = parsed.references;
        segments = [];
        for (i = 0, len = ref.length; i < len; i += 1) {
            segment = new Dash.vo.Segment();
            segment.duration = ref[i].duration;
            segment.media = media;
            segment.startTime = ref[i].time;
            segment.timescale = ref[i].timescale;
            start = ref[i].offset;
            end = ref[i].offset + ref[i].size - 1;
            segment.mediaRange = start + "-" + end;
            segments.push(segment);
        }
        this.debug.log("Parsed SIDX box: " + segments.length + " segments.");
        return Q.when(segments);
    }, findInit = function(data, info) {
        var deferred = Q.defer(), ftyp, moov, start, end, d = new DataView(data), pos = 0, type = "", size = 0, bytesAvailable, i, c, request, loaded = false, irange, self = this;
        self.debug.log("Searching for initialization.");
        while (type !== "moov" && pos < d.byteLength) {
            size = d.getUint32(pos);
            pos += 4;
            type = "";
            for (i = 0; i < 4; i += 1) {
                c = d.getInt8(pos);
                type += String.fromCharCode(c);
                pos += 1;
            }
            if (type === "ftyp") {
                ftyp = pos - 8;
            }
            if (type === "moov") {
                moov = pos - 8;
            }
            if (type !== "moov") {
                pos += size - 8;
            }
        }
        bytesAvailable = d.byteLength - pos;
        if (type !== "moov") {
            self.debug.log("Loading more bytes to find initialization.");
            info.range.start = 0;
            info.range.end = info.bytesLoaded + info.bytesToLoad;
            request = new XMLHttpRequest();
            request.onloadend = function() {
                if (!loaded) {
                    deferred.reject("Error loading initialization.");
                }
            };
            request.onload = function() {
                loaded = true;
                info.bytesLoaded = info.range.end;
                findInit.call(self, request.response).then(function(segments) {
                    deferred.resolve(segments);
                });
            };
            request.onerror = function() {
                deferred.reject("Error loading initialization.");
            };
            request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
            request.responseType = "arraybuffer";
            request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
            request = self.tokenAuthentication.setTokenInRequestHeader(request);
            request.send(null);
        } else {
            start = ftyp === undefined ? moov : ftyp;
            end = moov + size - 1;
            irange = start + "-" + end;
            self.debug.log("Found the initialization.  Range: " + irange);
            deferred.resolve(irange);
        }
        return deferred.promise;
    }, loadInit = function(media) {
        var deferred = Q.defer(), request = new XMLHttpRequest(), needFailureReport = true, self = this, info = {
            url: media,
            range: {},
            searching: false,
            bytesLoaded: 0,
            bytesToLoad: 1500,
            request: request
        };
        self.debug.log("Start searching for initialization.");
        info.range.start = 0;
        info.range.end = info.bytesToLoad;
        request.onload = function() {
            if (request.status < 200 || request.status > 299) {
                return;
            }
            needFailureReport = false;
            info.bytesLoaded = info.range.end;
            findInit.call(self, request.response, info).then(function(range) {
                deferred.resolve(range);
            });
        };
        request.onloadend = request.onerror = function() {
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;
            self.errHandler.downloadError("initialization", info.url, request);
            deferred.reject(request);
        };
        request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
        request.responseType = "arraybuffer";
        request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
        request = self.tokenAuthentication.setTokenInRequestHeader(request);
        request.send(null);
        self.debug.log("Perform init search: " + info.url);
        return deferred.promise;
    }, findSIDX = function(data, info) {
        var deferred = Q.defer(), d = new DataView(data), request = new XMLHttpRequest(), pos = 0, type = "", size = 0, bytesAvailable, sidxBytes, sidxSlice, sidxOut, i, c, needFailureReport = true, parsed, ref, loadMultiSidx = false, self = this;
        self.debug.log("Searching for SIDX box.");
        self.debug.log(info.bytesLoaded + " bytes loaded.");
        while (type !== "sidx" && pos < d.byteLength) {
            size = d.getUint32(pos);
            pos += 4;
            type = "";
            for (i = 0; i < 4; i += 1) {
                c = d.getInt8(pos);
                type += String.fromCharCode(c);
                pos += 1;
            }
            if (type !== "sidx") {
                pos += size - 8;
            }
        }
        bytesAvailable = d.byteLength - pos;
        if (type !== "sidx") {
            deferred.reject();
        } else if (bytesAvailable < size - 8) {
            self.debug.log("Found SIDX but we don't have all of it.");
            info.range.start = 0;
            info.range.end = info.bytesLoaded + (size - bytesAvailable);
            request.onload = function() {
                if (request.status < 200 || request.status > 299) {
                    return;
                }
                needFailureReport = false;
                info.bytesLoaded = info.range.end;
                findSIDX.call(self, request.response, info).then(function(segments) {
                    deferred.resolve(segments);
                });
            };
            request.onloadend = request.onerror = function() {
                if (!needFailureReport) {
                    return;
                }
                needFailureReport = false;
                self.errHandler.downloadError("SIDX", info.url, request);
                deferred.reject(request);
            };
            request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
            request.responseType = "arraybuffer";
            request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
            request = self.tokenAuthentication.setTokenInRequestHeader(request);
            request.send(null);
        } else {
            info.range.start = pos - 8;
            info.range.end = info.range.start + size;
            self.debug.log("Found the SIDX box.  Start: " + info.range.start + " | End: " + info.range.end);
            sidxBytes = new ArrayBuffer(info.range.end - info.range.start);
            sidxOut = new Uint8Array(sidxBytes);
            sidxSlice = new Uint8Array(data, info.range.start, info.range.end - info.range.start);
            sidxOut.set(sidxSlice);
            parsed = this.parseSIDX.call(this, sidxBytes, info.range.start);
            ref = parsed.references;
            if (ref !== null && ref !== undefined && ref.length > 0) {
                loadMultiSidx = ref[0].type === 1;
            }
            if (loadMultiSidx) {
                self.debug.log("Initiate multiple SIDX load.");
                var j, len, ss, se, r, funcs = [], segs;
                for (j = 0, len = ref.length; j < len; j += 1) {
                    ss = ref[j].offset;
                    se = ref[j].offset + ref[j].size - 1;
                    r = ss + "-" + se;
                    funcs.push(this.loadSegments.call(self, info.url, r));
                }
                Q.all(funcs).then(function(results) {
                    segs = [];
                    for (j = 0, len = results.length; j < len; j += 1) {
                        segs = segs.concat(results[j]);
                    }
                    deferred.resolve(segs);
                }, function(httprequest) {
                    deferred.reject(httprequest);
                });
            } else {
                self.debug.log("Parsing segments from SIDX.");
                parseSegments.call(self, sidxBytes, info.url, info.range.start).then(function(segments) {
                    deferred.resolve(segments);
                });
            }
        }
        return deferred.promise;
    }, loadSegments = function(media, theRange) {
        var deferred = Q.defer(), request = new XMLHttpRequest(), parts, needFailureReport = true, self = this, info = {
            url: media,
            range: {},
            searching: false,
            bytesLoaded: 0,
            bytesToLoad: 1500,
            request: request
        };
        if (theRange === null) {
            self.debug.log("No known range for SIDX request.");
            info.searching = true;
            info.range.start = 0;
            info.range.end = info.bytesToLoad;
        } else {
            parts = theRange.split("-");
            info.range.start = parseFloat(parts[0]);
            info.range.end = parseFloat(parts[1]);
        }
        request.onload = function() {
            if (request.status < 200 || request.status > 299) {
                return;
            }
            needFailureReport = false;
            if (info.searching) {
                info.bytesLoaded = info.range.end;
                findSIDX.call(self, request.response, info).then(function(segments) {
                    deferred.resolve(segments);
                });
            } else {
                parseSegments.call(self, request.response, info.url, info.range.start).then(function(segments) {
                    deferred.resolve(segments);
                });
            }
        };
        request.onloadend = request.onerror = function() {
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;
            self.errHandler.downloadError("SIDX", info.url, request);
            deferred.reject(request);
        };
        request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
        request.responseType = "arraybuffer";
        request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
        request = self.tokenAuthentication.setTokenInRequestHeader(request);
        request.send(null);
        self.debug.log("Perform SIDX load: " + info.url);
        return deferred.promise;
    };
    return {
        debug: undefined,
        errHandler: undefined,
        tokenAuthentication: undefined,
        loadSegments: loadSegments,
        loadInitialization: loadInit,
        parseSegments: parseSegments,
        parseSIDX: parseSIDX,
        findSIDX: findSIDX
    };
};

Dash.dependencies.BaseURLExtensions.prototype = {
    constructor: Dash.dependencies.BaseURLExtensions
};

Dash.dependencies.DashAdapter = function() {
    "use strict";
    var periods = [], adaptations = {}, getRepresentationForTrackInfo = function(trackInfo, representationController) {
        return representationController.getRepresentationForQuality(trackInfo.quality);
    }, getAdaptationForMediaInfo = function(mediaInfo) {
        return adaptations[mediaInfo.streamInfo.id][mediaInfo.index];
    }, getPeriodForStreamInfo = function(streamInfo) {
        var period, ln = periods.length, i = 0;
        for (i; i < ln; i += 1) {
            period = periods[i];
            if (streamInfo.id === period.id) return period;
        }
        return null;
    }, convertRepresentationToTrackInfo = function(manifest, representation) {
        var trackInfo = new MediaPlayer.vo.TrackInfo(), a = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index], r = this.manifestExt.getRepresentationFor(representation.index, a);
        trackInfo.id = representation.id;
        trackInfo.quality = representation.index;
        trackInfo.bandwidth = this.manifestExt.getBandwidth(r);
        trackInfo.DVRWindow = representation.segmentAvailabilityRange;
        trackInfo.fragmentDuration = representation.segmentDuration || (representation.segments && representation.segments.length > 0 ? representation.segments[0].duration : NaN);
        trackInfo.MSETimeOffset = representation.MSETimeOffset;
        trackInfo.useCalculatedLiveEdgeTime = representation.useCalculatedLiveEdgeTime;
        trackInfo.mediaInfo = convertAdaptationToMediaInfo.call(this, manifest, representation.adaptation);
        return trackInfo;
    }, convertAdaptationToMediaInfo = function(manifest, adaptation) {
        var mediaInfo = new MediaPlayer.vo.MediaInfo(), self = this, a = adaptation.period.mpd.manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index];
        mediaInfo.id = adaptation.id;
        mediaInfo.index = adaptation.index;
        mediaInfo.type = adaptation.type;
        mediaInfo.streamInfo = convertPeriodToStreamInfo.call(this, manifest, adaptation.period);
        mediaInfo.trackCount = this.manifestExt.getRepresentationCount(a);
        mediaInfo.lang = this.manifestExt.getLanguageForAdaptation(a);
        mediaInfo.codec = this.manifestExt.getCodec(a);
        mediaInfo.mimeType = this.manifestExt.getMimeType(a);
        mediaInfo.contentProtection = this.manifestExt.getContentProtectionData(a);
        mediaInfo.bitrateList = this.manifestExt.getBitrateListForAdaptation(a);
        if (mediaInfo.contentProtection) {
            mediaInfo.contentProtection.forEach(function(item) {
                item.KID = self.manifestExt.getKID(item);
            });
        }
        mediaInfo.isText = this.manifestExt.getIsTextTrack(mediaInfo.mimeType);
        return mediaInfo;
    }, convertPeriodToStreamInfo = function(manifest, period) {
        var streamInfo = new MediaPlayer.vo.StreamInfo(), THRESHOLD = 1;
        streamInfo.id = period.id;
        streamInfo.index = period.index;
        streamInfo.start = period.start;
        streamInfo.duration = period.duration;
        streamInfo.manifestInfo = convertMpdToManifestInfo.call(this, manifest, period.mpd);
        streamInfo.isLast = Math.abs(streamInfo.start + streamInfo.duration - streamInfo.manifestInfo.duration) < THRESHOLD;
        return streamInfo;
    }, convertMpdToManifestInfo = function(manifest, mpd) {
        var manifestInfo = new MediaPlayer.vo.ManifestInfo();
        manifestInfo.DVRWindowSize = mpd.timeShiftBufferDepth;
        manifestInfo.loadedTime = mpd.manifest.loadedTime;
        manifestInfo.availableFrom = mpd.availabilityStartTime;
        manifestInfo.minBufferTime = mpd.manifest.minBufferTime;
        manifestInfo.maxFragmentDuration = mpd.maxSegmentDuration;
        manifestInfo.duration = this.manifestExt.getDuration(manifest);
        manifestInfo.isDynamic = this.manifestExt.getIsDynamic(manifest);
        return manifestInfo;
    }, getMediaInfoForType = function(manifest, streamInfo, type) {
        var periodInfo = getPeriodForStreamInfo(streamInfo), periodId = periodInfo.id, data = this.manifestExt.getAdaptationForType(manifest, streamInfo.index, type), idx;
        if (!data) return null;
        idx = this.manifestExt.getIndexForAdaptation(data, manifest, streamInfo.index);
        adaptations[periodId] = adaptations[periodId] || this.manifestExt.getAdaptationsForPeriod(manifest, periodInfo);
        return convertAdaptationToMediaInfo.call(this, manifest, adaptations[periodId][idx]);
    }, getStreamsInfoFromManifest = function(manifest) {
        var mpd, streams = [], ln, i;
        if (!manifest) return null;
        mpd = this.manifestExt.getMpd(manifest);
        periods = this.manifestExt.getRegularPeriods(manifest, mpd);
        adaptations = {};
        ln = periods.length;
        for (i = 0; i < ln; i += 1) {
            streams.push(convertPeriodToStreamInfo.call(this, manifest, periods[i]));
        }
        return streams;
    }, getMpdInfo = function(manifest) {
        var mpd = this.manifestExt.getMpd(manifest);
        return convertMpdToManifestInfo.call(this, manifest, mpd);
    }, getInitRequest = function(streamProcessor, quality) {
        var representation = streamProcessor.trackController.getRepresentationForQuality(quality);
        return streamProcessor.indexHandler.getInitRequest(representation);
    }, getNextFragmentRequest = function(streamProcessor, trackInfo) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.trackController);
        return streamProcessor.indexHandler.getNextSegmentRequest(representation);
    }, getFragmentRequestForTime = function(streamProcessor, trackInfo, time, options) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.trackController);
        return streamProcessor.indexHandler.getSegmentRequestForTime(representation, time, options);
    }, generateFragmentRequestForTime = function(streamProcessor, trackInfo, time) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.trackController);
        return streamProcessor.indexHandler.generateSegmentRequestForTime(representation, time);
    }, getIndexHandlerTime = function(streamProcessor) {
        return streamProcessor.indexHandler.getCurrentTime();
    }, setIndexHandlerTime = function(streamProcessor, value) {
        return streamProcessor.indexHandler.setCurrentTime(value);
    }, updateData = function(manifest, streamProcessor) {
        var periodInfo = getPeriodForStreamInfo(streamProcessor.getStreamInfo()), mediaInfo = streamProcessor.getMediaInfo(), adaptation = getAdaptationForMediaInfo(mediaInfo), type = streamProcessor.getType(), id, data;
        id = mediaInfo.id;
        data = id ? this.manifestExt.getAdaptationForId(id, manifest, periodInfo.index) : this.manifestExt.getAdaptationForIndex(mediaInfo.index, manifest, periodInfo.index);
        streamProcessor.trackController.updateData(data, adaptation, type);
    }, getTrackInfoForQuality = function(manifest, representationController, quality) {
        var representation = representationController.getRepresentationForQuality(quality);
        return representation ? convertRepresentationToTrackInfo.call(this, manifest, representation) : null;
    }, getCurrentTrackInfo = function(manifest, representationController) {
        var representation = representationController.getCurrentRepresentation();
        return representation ? convertRepresentationToTrackInfo.call(this, manifest, representation) : null;
    }, getEvent = function(eventBox, eventStreams, startTime) {
        var event = new Dash.vo.Event(), schemeIdUri = eventBox[0], value = eventBox[1], timescale = eventBox[2], presentationTimeDelta = eventBox[3], duration = eventBox[4], id = eventBox[5], messageData = eventBox[6], presentationTime = startTime * timescale + presentationTimeDelta;
        if (!eventStreams[schemeIdUri]) return null;
        event.eventStream = eventStreams[schemeIdUri];
        event.eventStream.value = value;
        event.eventStream.timescale = timescale;
        event.duration = duration;
        event.id = id;
        event.presentationTime = presentationTime;
        event.messageData = messageData;
        event.presentationTimeDelta = presentationTimeDelta;
        return event;
    }, getEventsFor = function(manifest, info, streamProcessor) {
        var events = [];
        if (info instanceof MediaPlayer.vo.StreamInfo) {
            events = this.manifestExt.getEventsForPeriod(manifest, getPeriodForStreamInfo(info));
        } else if (info instanceof MediaPlayer.vo.MediaInfo) {
            events = this.manifestExt.getEventStreamForAdaptationSet(manifest, getAdaptationForMediaInfo(info));
        } else if (info instanceof MediaPlayer.vo.TrackInfo) {
            events = this.manifestExt.getEventStreamForRepresentation(manifest, getRepresentationForTrackInfo(info, streamProcessor.trackController));
        }
        return events;
    };
    return {
        system: undefined,
        manifestExt: undefined,
        timelineConverter: undefined,
        metricsList: {
            TCP_CONNECTION: "TcpConnection",
            HTTP_REQUEST: "HttpRequest",
            HTTP_REQUEST_TRACE: "HttpRequestTrace",
            TRACK_SWITCH: "RepresentationSwitch",
            BUFFER_LEVEL: "BufferLevel",
            BUFFER_STATE: "BufferState",
            DVR_INFO: "DVRInfo",
            DROPPED_FRAMES: "DroppedFrames",
            SCHEDULING_INFO: "SchedulingInfo",
            MANIFEST_UPDATE: "ManifestUpdate",
            MANIFEST_UPDATE_STREAM_INFO: "ManifestUpdatePeriodInfo",
            MANIFEST_UPDATE_TRACK_INFO: "ManifestUpdateRepresentationInfo",
            PLAY_LIST: "PlayList",
            PLAY_LIST_TRACE: "PlayListTrace"
        },
        convertDataToTrack: convertRepresentationToTrackInfo,
        convertDataToMedia: convertAdaptationToMediaInfo,
        convertDataToStream: convertPeriodToStreamInfo,
        getDataForTrack: getRepresentationForTrackInfo,
        getDataForMedia: getAdaptationForMediaInfo,
        getDataForStream: getPeriodForStreamInfo,
        getStreamsInfo: getStreamsInfoFromManifest,
        getManifestInfo: getMpdInfo,
        getMediaInfoForType: getMediaInfoForType,
        getCurrentTrackInfo: getCurrentTrackInfo,
        getTrackInfoForQuality: getTrackInfoForQuality,
        updateData: updateData,
        getInitRequest: getInitRequest,
        getNextFragmentRequest: getNextFragmentRequest,
        getFragmentRequestForTime: getFragmentRequestForTime,
        generateFragmentRequestForTime: generateFragmentRequestForTime,
        getIndexHandlerTime: getIndexHandlerTime,
        setIndexHandlerTime: setIndexHandlerTime,
        getEventsFor: getEventsFor,
        getEvent: getEvent,
        reset: function() {
            periods = [];
            adaptations = {};
        }
    };
};

Dash.dependencies.DashAdapter.prototype = {
    constructor: Dash.dependencies.DashAdapter
};

Dash.dependencies.DashHandler = function() {
    "use strict";
    var index = -1, requestedTime, isDynamic, type, offset = null, zeroPadToLength = function(numStr, minStrLength) {
        while (numStr.length < minStrLength) {
            numStr = "0" + numStr;
        }
        return numStr;
    }, replaceTokenForTemplate = function(url, token, value) {
        var startPos = 0, endPos = 0, tokenLen = token.length, formatTag = "%0", formatTagLen = formatTag.length, formatTagPos, specifier, width, paddedValue;
        while (true) {
            startPos = url.indexOf("$" + token);
            if (startPos < 0) {
                return url;
            }
            endPos = url.indexOf("$", startPos + tokenLen);
            if (endPos < 0) {
                return url;
            }
            formatTagPos = url.indexOf(formatTag, startPos + tokenLen);
            if (formatTagPos > startPos && formatTagPos < endPos) {
                specifier = url.charAt(endPos - 1);
                width = parseInt(url.substring(formatTagPos + formatTagLen, endPos - 1), 10);
                switch (specifier) {
                  case "d":
                  case "i":
                  case "u":
                    paddedValue = zeroPadToLength(value.toString(), width);
                    break;

                  case "x":
                    paddedValue = zeroPadToLength(value.toString(16), width);
                    break;

                  case "X":
                    paddedValue = zeroPadToLength(value.toString(16), width).toUpperCase();
                    break;

                  case "o":
                    paddedValue = zeroPadToLength(value.toString(8), width);
                    break;

                  default:
                    this.debug.log("Unsupported/invalid IEEE 1003.1 format identifier string in URL");
                    return url;
                }
            } else {
                paddedValue = value;
            }
            url = url.substring(0, startPos) + paddedValue + url.substring(endPos + 1);
        }
    }, unescapeDollarsInTemplate = function(url) {
        return url.split("$$").join("$");
    }, replaceIDForTemplate = function(url, value) {
        if (value === null || url.indexOf("$RepresentationID$") === -1) {
            return url;
        }
        var v = value.toString();
        return url.split("$RepresentationID$").join(v);
    }, getNumberForSegment = function(segment, segmentIndex) {
        return segment.representation.startNumber + segmentIndex;
    }, getRequestUrl = function(destination, representation) {
        var baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL, url;
        if (destination === baseURL) {
            url = destination;
        } else if (destination.indexOf("http://") !== -1) {
            url = destination;
        } else {
            url = baseURL + destination;
        }
        return url;
    }, generateInitRequest = function(representation, streamType) {
        var self = this, period, request = new MediaPlayer.vo.SegmentRequest(), presentationStartTime;
        period = representation.adaptation.period;
        request.streamType = streamType;
        request.type = "Initialization Segment";
        request.url = getRequestUrl(representation.initialization, representation);
        request.range = representation.range;
        presentationStartTime = period.start;
        request.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        request.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);
        request.quality = representation.index;
        return request;
    }, getInit = function(representation) {
        var deferred = Q.defer(), request = null, url = null, self = this;
        if (!representation) {
            return Q.reject("no represenation");
        }
        if (representation.initialization) {
            request = generateInitRequest.call(self, representation, type);
            deferred.resolve(request);
        } else {
            url = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL;
            self.baseURLExt.loadInitialization(url).then(function(theRange) {
                representation.range = theRange;
                representation.initialization = url;
                request = generateInitRequest.call(self, representation, type);
                deferred.resolve(request);
            }, function(httprequest) {
                deferred.reject(httprequest);
            });
        }
        return deferred.promise;
    }, isMediaFinished = function(representation) {
        var sDuration, period = representation.adaptation.period, isFinished = false, seg, fTime;
        if (offset === null || offset > representation.segments[0].availabilityIdx) {
            offset = representation.segments[0].availabilityIdx;
        }
        if (isDynamic) {
            isFinished = false;
        } else {
            if (index < 0) {
                isFinished = false;
            } else if (index < representation.availableSegmentsNumber + offset) {
                seg = getSegmentByIndex(index, representation);
                if (seg) {
                    fTime = seg.presentationStartTime - period.start;
                    sDuration = representation.adaptation.period.duration;
                    isFinished = fTime >= sDuration;
                }
            } else {
                isFinished = true;
            }
        }
        return Q.when(isFinished);
    }, getIndexBasedSegment = function(representation, index) {
        var self = this, seg, duration, presentationStartTime, presentationEndTime;
        duration = representation.segmentDuration;
        presentationStartTime = representation.adaptation.period.start + index * duration;
        presentationEndTime = presentationStartTime + duration;
        seg = new Dash.vo.Segment();
        seg.representation = representation;
        seg.duration = duration;
        seg.presentationStartTime = presentationStartTime;
        seg.mediaStartTime = self.timelineConverter.calcMediaTimeFromPresentationTime(seg.presentationStartTime, representation);
        seg.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(seg.presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic);
        seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic);
        seg.replacementNumber = getNumberForSegment(seg, index);
        seg.availabilityIdx = index;
        return seg;
    }, getSegmentsFromTimeline = function(representation) {
        var self = this, template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate, timeline = template.SegmentTimeline, isAvailableSegmentNumberCalculated = representation.availableSegmentsNumber > 0, maxSegmentsAhead = 10, segments = [], fragments, frag, i, len, j, repeat, repeatEndTime, nextFrag, time = 0, availabilityIdx = -1, calculatedRange, hasEnoughSegments, requiredMediaTime, startIdx, endIdx, fTimescale, createSegment = function(s) {
            return getTimeBasedSegment.call(self, representation, time, s.d, fTimescale, template.media, s.mediaRange, availabilityIdx);
        };
        fTimescale = representation.timescale;
        fragments = timeline.S_asArray;
        calculatedRange = decideSegmentListRangeForTimeline.call(self, representation);
        if (calculatedRange) {
            startIdx = calculatedRange.start;
            endIdx = calculatedRange.end;
        } else {
            requiredMediaTime = self.timelineConverter.calcMediaTimeFromPresentationTime(requestedTime || 0, representation);
        }
        for (i = 0, len = fragments.length; i < len; i += 1) {
            frag = fragments[i];
            repeat = 0;
            if (frag.hasOwnProperty("r")) {
                repeat = frag.r;
            }
            if (frag.hasOwnProperty("t")) {
                time = frag.t;
            }
            if (repeat < 0) {
                nextFrag = fragments[i + 1];
                repeatEndTime = nextFrag && nextFrag.hasOwnProperty("t") ? nextFrag.t / fTimescale : representation.adaptation.period.duration;
                repeat = Math.ceil((repeatEndTime - time / fTimescale) / (frag.d / fTimescale)) - 1;
            }
            if (hasEnoughSegments) {
                if (isAvailableSegmentNumberCalculated) break;
                availabilityIdx += repeat + 1;
                continue;
            }
            for (j = 0; j <= repeat; j += 1) {
                availabilityIdx += 1;
                if (calculatedRange) {
                    if (availabilityIdx > endIdx) {
                        hasEnoughSegments = true;
                        if (isAvailableSegmentNumberCalculated) break;
                        continue;
                    }
                    if (availabilityIdx >= startIdx) {
                        segments.push(createSegment.call(self, frag));
                    }
                } else {
                    if (segments.length > maxSegmentsAhead) {
                        hasEnoughSegments = true;
                        if (isAvailableSegmentNumberCalculated) break;
                        continue;
                    }
                    if (time / fTimescale >= requiredMediaTime - frag.d / fTimescale) {
                        segments.push(createSegment.call(self, frag));
                    }
                }
                time += frag.d;
            }
        }
        if (!isAvailableSegmentNumberCalculated) {
            var availabilityStartTime, availabilityEndTime, f = fragments[0];
            availabilityStartTime = f.t === undefined ? 0 : self.timelineConverter.calcPresentationTimeFromMediaTime(f.t / fTimescale, representation);
            availabilityEndTime = self.timelineConverter.calcPresentationTimeFromMediaTime((time - frag.d) / fTimescale, representation);
            representation.segmentAvailabilityRange = {
                start: availabilityStartTime,
                end: availabilityEndTime
            };
            representation.availableSegmentsNumber = availabilityIdx + 1;
        }
        return Q.when(segments);
    }, getSegmentsFromTemplate = function(representation) {
        var segments = [], self = this, deferred = Q.defer(), template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate, duration = representation.segmentDuration, segmentRange = null, periodStartIdx = Math.floor(representation.adaptation.period.start / duration), i, startIdx, endIdx, seg = null, start, url = null;
        start = representation.startNumber;
        waitForAvailabilityWindow.call(self, representation).then(function(availabilityWindow) {
            representation.segmentAvailabilityRange = availabilityWindow;
            segmentRange = decideSegmentListRangeForTemplate.call(self, representation);
            startIdx = segmentRange.start;
            endIdx = segmentRange.end;
            for (i = startIdx; i <= endIdx; i += 1) {
                seg = getIndexBasedSegment.call(self, representation, i - (isDynamic ? periodStartIdx : 0));
                seg.replacementTime = (start + i - 1) * representation.segmentDuration;
                url = template.media;
                url = replaceTokenForTemplate(url, "Number", seg.replacementNumber);
                url = replaceTokenForTemplate(url, "Time", seg.replacementTime);
                seg.media = url;
                segments.push(seg);
                seg = null;
            }
            representation.availableSegmentsNumber = periodStartIdx + Math.ceil((availabilityWindow.end - availabilityWindow.start) / duration);
            deferred.resolve(segments);
        });
        return deferred.promise;
    }, decideSegmentListRangeForTemplate = function(representation) {
        var self = this, periodStart = representation.adaptation.period.start, duration = representation.segmentDuration, minBufferTime = representation.adaptation.period.mpd.manifest.minBufferTime, availabilityWindow = representation.segmentAvailabilityRange, originAvailabilityTime = NaN, originSegment = null, currentSegmentList = representation.segments, availabilityLowerLimit = 2 * duration, availabilityUpperLimit = Math.max(2 * minBufferTime, 10 * duration), start, end, range;
        if (!availabilityWindow) {
            availabilityWindow = self.timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);
        }
        if (isDynamic && !representation.adaptation.period.mpd.isClientServerTimeSyncCompleted) {
            start = Math.floor(availabilityWindow.start / duration);
            end = Math.floor(availabilityWindow.end / duration);
            range = {
                start: start,
                end: end
            };
            return range;
        }
        if (currentSegmentList) {
            originSegment = getSegmentByIndex(index, representation);
            originAvailabilityTime = originSegment ? originSegment.presentationStartTime - periodStart : index > 0 ? index * duration : requestedTime - periodStart || currentSegmentList[0].presentationStartTime - periodStart;
        } else {
            originAvailabilityTime = index > 0 ? index * duration : isDynamic ? availabilityWindow.end : availabilityWindow.start;
        }
        start = Math.floor(Math.max(originAvailabilityTime - availabilityLowerLimit, availabilityWindow.start) / duration);
        end = Math.floor(Math.min(start + availabilityUpperLimit / duration, availabilityWindow.end / duration));
        range = {
            start: start,
            end: end
        };
        return range;
    }, decideSegmentListRangeForTimeline = function(representation) {
        var originAvailabilityIdx = NaN, currentSegmentList = representation.segments, availabilityLowerLimit = 2, availabilityUpperLimit = 10, firstIdx = 0, lastIdx = Number.POSITIVE_INFINITY, start, end, range;
        if (isDynamic && !representation.adaptation.period.mpd.isClientServerTimeSyncCompleted) {
            range = {
                start: firstIdx,
                end: lastIdx
            };
            return range;
        }
        if (!isDynamic && requestedTime) return null;
        if (currentSegmentList) {
            if (index < 0) return null;
            originAvailabilityIdx = index;
        } else {
            originAvailabilityIdx = index > 0 ? index : isDynamic ? lastIdx : firstIdx;
        }
        start = Math.max(originAvailabilityIdx - availabilityLowerLimit, firstIdx);
        end = Math.min(originAvailabilityIdx + availabilityUpperLimit, lastIdx);
        range = {
            start: start,
            end: end
        };
        return range;
    }, waitForAvailabilityWindow = function(representation) {
        var self = this, deferred = Q.defer(), range, waitingTime, getRange = function() {
            range = self.timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);
            if (range.end > 0) {
                deferred.resolve(range);
            } else {
                waitingTime = Math.abs(range.end) * 1e3;
                setTimeout(getRange, waitingTime);
            }
        };
        getRange();
        return deferred.promise;
    }, getTimeBasedSegment = function(representation, time, duration, fTimescale, url, range, index) {
        var self = this, scaledTime = time / fTimescale, scaledDuration = Math.min(duration / fTimescale, representation.adaptation.period.mpd.maxSegmentDuration), presentationStartTime, presentationEndTime, seg;
        presentationStartTime = self.timelineConverter.calcPresentationTimeFromMediaTime(scaledTime, representation);
        presentationStartTime = scaledTime;
        presentationEndTime = presentationStartTime + scaledDuration;
        seg = new Dash.vo.Segment();
        seg.representation = representation;
        seg.duration = scaledDuration;
        seg.mediaStartTime = scaledTime;
        seg.presentationStartTime = presentationStartTime;
        seg.availabilityStartTime = representation.adaptation.period.mpd.manifest.mpdLoadedTime;
        seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic);
        seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic);
        seg.replacementTime = time;
        seg.replacementNumber = getNumberForSegment(seg, index);
        url = replaceTokenForTemplate(url, "Number", seg.replacementNumber);
        url = replaceTokenForTemplate(url, "Time", seg.replacementTime);
        seg.media = url;
        seg.mediaRange = range;
        seg.availabilityIdx = index;
        return seg;
    }, getSegmentsFromList = function(representation) {
        var self = this, segments = [], deferred = Q.defer(), list = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentList, len = list.SegmentURL_asArray.length, i, seg, s, range, startIdx = 0, endIdx = list.SegmentURL_asArray.length, start;
        start = representation.startNumber;
        waitForAvailabilityWindow.call(self, representation).then(function(availabilityWindow) {
            if (!isDynamic) {
                range = decideSegmentListRangeForTemplate.call(self, representation);
                startIdx = range.start;
                endIdx = range.end;
            }
            for (i = startIdx; i < endIdx; i += 1) {
                s = list.SegmentURL_asArray[i];
                seg = getIndexBasedSegment.call(self, representation, i);
                seg.replacementTime = (start + i - 1) * representation.segmentDuration;
                seg.media = s.media;
                seg.mediaRange = s.mediaRange;
                seg.index = s.index;
                seg.indexRange = s.indexRange;
                if (s.sequenceNumber) {
                    seg.sequenceNumber = s.sequenceNumber;
                }
                segments.push(seg);
                seg = null;
            }
            representation.segmentAvailabilityRange = availabilityWindow;
            representation.availableSegmentsNumber = len;
            deferred.resolve(segments);
        });
        return deferred.promise;
    }, getSegmentsFromSource = function(representation) {
        var self = this, baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL, deferred = Q.defer(), segments = [], count = 0, range = null, s, i, len, seg;
        if (representation.indexRange) {
            range = representation.indexRange;
        }
        this.baseURLExt.loadSegments(baseURL, range).then(function(fragments) {
            for (i = 0, len = fragments.length; i < len; i += 1) {
                s = fragments[i];
                seg = getTimeBasedSegment.call(self, representation, s.startTime, s.duration, s.timescale, s.media, s.mediaRange, count);
                segments.push(seg);
                seg = null;
                count += 1;
            }
            representation.segmentAvailabilityRange = {
                start: segments[0].presentationStartTime,
                end: segments[len - 1].presentationStartTime
            };
            representation.availableSegmentsNumber = len;
            deferred.resolve(segments);
        });
        return deferred.promise;
    }, getSegments = function(representation) {
        var segmentPromise, deferred = Q.defer(), self = this, lastIdx;
        if (!isSegmentListUpdateRequired.call(self, representation)) {
            return Q.when(representation.segments);
        } else {
            if (representation.segmentInfoType === "SegmentTimeline") {
                segmentPromise = getSegmentsFromTimeline.call(self, representation);
            } else if (representation.segmentInfoType === "SegmentTemplate") {
                segmentPromise = getSegmentsFromTemplate.call(self, representation);
            } else if (representation.segmentInfoType === "SegmentList") {
                segmentPromise = getSegmentsFromList.call(self, representation);
            } else {
                segmentPromise = getSegmentsFromSource.call(self, representation);
            }
            Q.when(segmentPromise).then(function(segments) {
                representation.segments = segments;
                lastIdx = segments.length - 1;
                if (isDynamic && isNaN(representation.adaptation.period.liveEdge)) {
                    var metrics = self.metricsModel.getMetricsFor("stream"), liveEdge = segments[lastIdx].presentationStartTime;
                    representation.adaptation.period.liveEdge = liveEdge;
                    self.metricsModel.updateManifestUpdateInfo(self.metricsExt.getCurrentManifestUpdate(metrics), {
                        presentationStartTime: liveEdge
                    });
                }
                deferred.resolve(segments);
            });
        }
        return deferred.promise;
    }, updateSegmentList = function(representation) {
        var self = this, deferred = Q.defer();
        representation.segments = null;
        self.debug.log("[DashHandler][" + type + "] updateSegmentList for representation ", representation.id);
        getSegments.call(self, representation).then(function(segments) {
            representation.segments = segments;
            deferred.resolve();
        });
        return deferred.promise;
    }, getIndexForSegments = function(time, representation) {
        var segments = representation.segments, segmentLastIdx = segments.length - 1, idx = -1, frag, ft, fd, i, self = this;
        self.debug.log("[DashHandler][" + type + "] getIndexForSegments for time ", time);
        if (segments && segments.length > 0) {
            for (i = segmentLastIdx; i >= 0; i--) {
                frag = segments[i];
                ft = frag.presentationStartTime;
                fd = frag.duration;
                if (time + Dash.dependencies.DashHandler.EPSILON >= ft && time - Dash.dependencies.DashHandler.EPSILON <= ft + fd) {
                    idx = frag.availabilityIdx;
                    self.debug.log("[DashHandler][" + type + "] getIndexForSegments, idx =  ", idx);
                    break;
                } else if (idx === -1 && time - Dash.dependencies.DashHandler.EPSILON > ft + fd) {
                    self.debug.log("[DashHandler][" + type + "] getIndexForSegments, (past the end) idx =  ", idx);
                    idx = isNaN(representation.segmentDuration) ? frag.availabilityIdx + 1 : Math.floor((time - representation.adaptation.period.start) / representation.segmentDuration);
                    break;
                }
            }
        }
        if (idx === -1) {
            if (!isNaN(representation.segmentDuration)) {
                self.debug.log("[DashHandler][" + type + "] getIndexForSegments, (segment duration) idx =  ", idx);
                idx = Math.floor((time - representation.adaptation.period.start) / representation.segmentDuration);
            } else {
                self.debug.log("Couldn't figure out a time!");
                self.debug.log("Time: " + time);
                self.debug.log(segments);
            }
        }
        return Q.when(idx);
    }, getSegmentByIndex = function(index, representation) {
        if (!representation || !representation.segments) return null;
        var ln = representation.segments.length, seg, i;
        for (i = 0; i < ln; i += 1) {
            seg = representation.segments[i];
            if (seg.availabilityIdx === index) {
                return seg;
            }
        }
        return null;
    }, getNextSegmentBySequenceNumber = function(sn, representation) {
        if (!representation || !representation.segments) return null;
        var ln = representation.segments.length, seg, i;
        for (i = 0; i < ln; i += 1) {
            seg = representation.segments[i];
            if (seg.sequenceNumber && seg.sequenceNumber === sn) {
                if (i < ln - 1) {
                    return representation.segments[i + 1];
                }
                return null;
            }
        }
        return null;
    }, isSegmentListUpdateRequired = function(representation) {
        var updateRequired = false, segments = representation.segments, upperIdx, lowerIdx, upperTime;
        if (!segments) {
            updateRequired = true;
        } else {
            lowerIdx = segments[0].availabilityIdx;
            upperIdx = segments[segments.length - 1].availabilityIdx;
            upperTime = segments[segments.length - 1].presentationStartTime;
            updateRequired = index < lowerIdx || index > upperIdx || requestedTime > upperTime;
        }
        return updateRequired;
    }, getRequestForSegment = function(segment) {
        if (segment === null || segment === undefined) {
            return Q.when(null);
        }
        var request = new MediaPlayer.vo.SegmentRequest(), representation = segment.representation, bandwidth = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].bandwidth, url;
        url = getRequestUrl(segment.media, representation);
        url = replaceTokenForTemplate(url, "Number", segment.replacementNumber);
        url = replaceTokenForTemplate(url, "Time", segment.replacementTime);
        url = replaceTokenForTemplate(url, "Bandwidth", bandwidth);
        url = replaceIDForTemplate(url, representation.id);
        url = unescapeDollarsInTemplate(url);
        request.streamType = type;
        request.type = "Media Segment";
        request.url = url;
        request.range = segment.mediaRange;
        request.startTime = segment.presentationStartTime;
        request.duration = segment.duration;
        request.timescale = representation.timescale;
        request.availabilityStartTime = segment.availabilityStartTime;
        request.availabilityEndTime = segment.availabilityEndTime;
        request.wallStartTime = segment.wallStartTime;
        request.quality = representation.index;
        request.index = segment.availabilityIdx;
        if (segment.sequenceNumber) {
            request.sequenceNumber = segment.sequenceNumber;
        }
        return Q.when(request);
    }, getForTime = function(representation, time) {
        var deferred, request, segment, self = this;
        if (!representation) {
            return Q.reject("no represenation");
        }
        requestedTime = time;
        self.debug.log("[DashHandler][" + type + "] Getting the request for time: " + time);
        deferred = Q.defer();
        getSegments.call(self, representation).then(function() {
            var segmentsPromise;
            segmentsPromise = getIndexForSegments.call(self, time, representation);
            return segmentsPromise;
        }).then(function(newIndex) {
            self.debug.log("[DashHandler][" + type + "] Index for time " + time + " is " + newIndex);
            index = newIndex;
            return isMediaFinished.call(self, representation);
        }).then(function(finished) {
            var requestPromise = null;
            if (finished) {
                request = new MediaPlayer.vo.SegmentRequest();
                request.action = request.ACTION_COMPLETE;
                request.index = index;
                self.debug.log("[DashHandler][" + type + "] Signal complete.");
                self.debug.log(request);
                deferred.resolve(request);
            } else {
                segment = getSegmentByIndex(index, representation);
                requestPromise = getRequestForSegment.call(self, segment);
            }
            return requestPromise;
        }).then(function(request) {
            deferred.resolve(request);
        });
        return deferred.promise;
    }, getNext = function(representation) {
        var deferred, request, segment, self = this;
        if (!representation) {
            return Q.reject("no represenation");
        }
        if (index === -1) {
            throw "You must call getSegmentRequestForTime first.";
        }
        requestedTime = null;
        index += 1;
        deferred = Q.defer();
        self.debug.log("[DashHandler][" + type + "] Getting the next request => index = " + index);
        isMediaFinished.call(self, representation).then(function(finished) {
            if (finished) {
                request = new MediaPlayer.vo.SegmentRequest();
                request.action = request.ACTION_COMPLETE;
                request.index = index;
                self.debug.log("[DashHandler][" + type + "] Signal complete.");
                deferred.resolve(request);
            } else {
                getSegments.call(self, representation).then(function() {
                    var segmentsPromise;
                    segment = getSegmentByIndex(index, representation);
                    segmentsPromise = getRequestForSegment.call(self, segment);
                    return segmentsPromise;
                }).then(function(request) {
                    deferred.resolve(request);
                });
            }
        });
        return deferred.promise;
    }, getNextFromSN = function(representation, sn) {
        var deferred, request, segment, self = this;
        if (!representation) {
            return Q.reject("no represenation");
        }
        if (index === -1) {
            throw "You must call getSegmentRequestForTime first.";
        }
        deferred = Q.defer();
        self.debug.log("[DashHandler][" + type + "] Getting the next request => sn = " + sn);
        getSegments.call(self, representation).then(function() {
            isMediaFinished.call(self, representation).then(function(finished) {
                if (finished) {
                    request = new MediaPlayer.vo.SegmentRequest();
                    request.action = request.ACTION_COMPLETE;
                    request.index = index;
                    self.debug.log("[DashHandler][" + type + "] Signal complete.");
                    deferred.resolve(request);
                } else {
                    segment = getNextSegmentBySequenceNumber(sn, representation);
                    if (segment === null) {
                        deferred.resolve(null);
                    } else {
                        index = segment.availabilityIdx;
                        getRequestForSegment.call(self, segment).then(function(request) {
                            deferred.resolve(request);
                        });
                    }
                }
            });
        });
        return deferred.promise;
    }, getSegmentCountForDuration = function(representation, requiredDuration, bufferedDuration) {
        var self = this, remainingDuration = Math.max(requiredDuration - bufferedDuration, 0), deferred = Q.defer(), segmentDuration, segmentCount = 0;
        if (!representation) {
            return Q.reject("no represenation");
        }
        self.debug.log("[DashHandler][" + type + "] getSegmentCountForDuration");
        getSegments.call(self, representation).then(function(segments) {
            segmentDuration = segments[0].duration;
            segmentCount = Math.ceil(remainingDuration / segmentDuration);
            deferred.resolve(segmentCount);
        }, function() {
            deferred.resolve(0);
        });
        return deferred.promise;
    }, getCurrentTime = function(representation) {
        var self = this, time, bufferedIndex, deferred = Q.defer();
        if (!representation) {
            return Q.reject("no represenation");
        }
        bufferedIndex = index;
        getSegments.call(self, representation).then(function(segments) {
            if (bufferedIndex < 0) {
                time = self.timelineConverter.calcPresentationStartTime(representation.adaptation.period);
            } else {
                bufferedIndex = bufferedIndex < segments[0].availabilityIdx ? segments[0].availabilityIdx : Math.min(segments[segments.length - 1].availabilityIdx, bufferedIndex);
                time = getSegmentByIndex(bufferedIndex, representation).presentationStartTime;
                self.debug.log("[DashHandler][" + type + "] getSegmentByIndex, index = " + bufferedIndex + " => time = " + time);
            }
            self.debug.log("[DashHandler][" + type + "] getCurrentTime => ", time);
            deferred.resolve(time);
        }, function() {
            deferred.reject();
        });
        return deferred.promise;
    };
    return {
        debug: undefined,
        baseURLExt: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        errHandler: undefined,
        timelineConverter: undefined,
        getType: function() {
            return type;
        },
        setType: function(value) {
            type = value;
        },
        getIsDynamic: function() {
            return isDynamic;
        },
        setIsDynamic: function(value) {
            isDynamic = value;
        },
        getInitRequest: getInit,
        getSegmentRequestForTime: getForTime,
        getNextSegmentRequest: getNext,
        getNextSegmentRequestFromSN: getNextFromSN,
        getCurrentTime: getCurrentTime,
        getSegmentCountForDuration: getSegmentCountForDuration,
        updateSegmentList: updateSegmentList
    };
};

Dash.dependencies.DashHandler.EPSILON = .003;

Dash.dependencies.DashHandler.prototype = {
    constructor: Dash.dependencies.DashHandler
};

Dash.dependencies.DashManifestExtensions = function() {
    "use strict";
    this.timelineConverter = undefined;
};

Dash.dependencies.DashManifestExtensions.prototype = {
    constructor: Dash.dependencies.DashManifestExtensions,
    getIsAudio: function(adaptation) {
        "use strict";
        var i, len, col = adaptation.ContentComponent_asArray, representation, result = false, found = false;
        if (col) {
            for (i = 0, len = col.length; i < len; i += 1) {
                if (col[i].contentType === "audio") {
                    result = true;
                    found = true;
                }
            }
        }
        if (adaptation.hasOwnProperty("mimeType")) {
            result = adaptation.mimeType.indexOf("audio") !== -1;
            found = true;
        }
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];
                if (representation.hasOwnProperty("mimeType")) {
                    result = representation.mimeType.indexOf("audio") !== -1;
                    found = true;
                }
                i += 1;
            }
        }
        if (result) {
            adaptation.type = "audio";
        }
        return Q.when(result);
    },
    getIsVideo: function(adaptation) {
        "use strict";
        var i, len, col = adaptation.ContentComponent_asArray, representation, result = false, found = false;
        if (col) {
            for (i = 0, len = col.length; i < len; i += 1) {
                if (col[i].contentType === "video") {
                    result = true;
                    found = true;
                }
            }
        }
        if (adaptation.hasOwnProperty("mimeType")) {
            result = adaptation.mimeType.indexOf("video") !== -1;
            found = true;
        }
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];
                if (representation.hasOwnProperty("mimeType")) {
                    result = representation.mimeType.indexOf("video") !== -1;
                    found = true;
                }
                i += 1;
            }
        }
        if (result) {
            adaptation.type = "video";
        }
        return Q.when(result);
    },
    getIsText: function(adaptation) {
        "use strict";
        var i, len, col = adaptation.ContentComponent_asArray, representation, result = false, found = false;
        if (col) {
            for (i = 0, len = col.length; i < len; i += 1) {
                if (col[i].contentType === "text") {
                    result = true;
                    found = true;
                }
            }
        }
        if (adaptation.hasOwnProperty("mimeType")) {
            result = adaptation.mimeType.indexOf("vtt") !== -1 || adaptation.mimeType.indexOf("ttml") !== -1;
            found = true;
        }
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];
                if (representation.hasOwnProperty("mimeType")) {
                    result = representation.mimeType.indexOf("vtt") !== -1 || representation.mimeType.indexOf("ttml") !== -1;
                    found = true;
                }
                i += 1;
            }
        }
        return Q.when(result);
    },
    getIsTextTrack: function(type) {
        return type === "text/vtt" || type === "application/ttml+xml" || type === "application/ttml+xml+mp4";
    },
    getIsMain: function() {
        "use strict";
        return Q.when(false);
    },
    processAdaptation: function(adaptation) {
        "use strict";
        if (adaptation.Representation_asArray !== undefined && adaptation.Representation_asArray !== null) {
            adaptation.Representation_asArray.sort(function(a, b) {
                return a.bandwidth - b.bandwidth;
            });
        }
        return adaptation;
    },
    getDataForId: function(id, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, i, len;
        for (i = 0, len = adaptations.length; i < len; i += 1) {
            if (adaptations[i].hasOwnProperty("id") && adaptations[i].id === id) {
                return Q.when(adaptations[i]);
            }
        }
        return Q.when(null);
    },
    getDataForIndex: function(index, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        return Q.when(adaptations[index]);
    },
    getDataIndex: function(data, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, i, len;
        if (data.id) {
            for (i = 0, len = adaptations.length; i < len; i += 1) {
                if (adaptations[i].id && adaptations[i].id === data.id) {
                    return Q.when(i);
                }
            }
        } else {
            var strData = JSON.stringify(data);
            var strAdapt;
            for (i = 0, len = adaptations.length; i < len; i += 1) {
                strAdapt = JSON.stringify(adaptations[i]);
                if (strAdapt === strData) {
                    return Q.when(i);
                }
            }
        }
        return Q.when(-1);
    },
    getVideoData: function(manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, i, len, deferred = Q.defer(), funcs = [];
        for (i = 0, len = adaptations.length; i < len; i += 1) {
            funcs.push(this.getIsVideo(adaptations[i]));
        }
        Q.all(funcs).then(function(results) {
            var found = false;
            for (i = 0, len = results.length; i < len; i += 1) {
                if (results[i] === true) {
                    found = true;
                    deferred.resolve(adaptations[i]);
                }
            }
            if (!found) {
                deferred.resolve(null);
            }
        });
        return deferred.promise;
    },
    getTextDatas: function(manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, i, len, deferred = Q.defer(), funcs = [];
        for (i = 0, len = adaptations.length; i < len; i += 1) {
            funcs.push(this.getIsText(adaptations[i]));
        }
        Q.all(funcs).then(function(results) {
            var datas = [];
            for (i = 0, len = results.length; i < len; i += 1) {
                if (results[i] === true) {
                    datas.push(adaptations[i]);
                }
                deferred.resolve(datas);
            }
        });
        return deferred.promise;
    },
    getAudioDatas: function(manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, i, len, deferred = Q.defer(), funcs = [];
        for (i = 0, len = adaptations.length; i < len; i += 1) {
            funcs.push(this.getIsAudio(adaptations[i]));
        }
        Q.all(funcs).then(function(results) {
            var datas = [];
            for (i = 0, len = results.length; i < len; i += 1) {
                if (results[i] === true) {
                    datas.push(adaptations[i]);
                }
            }
            deferred.resolve(datas);
        });
        return deferred.promise;
    },
    getPrimaryAudioData: function(manifest, periodIndex) {
        "use strict";
        var i, len, deferred = Q.defer(), funcs = [], self = this;
        this.getAudioDatas(manifest, periodIndex).then(function(datas) {
            if (!datas || datas.length === 0) {
                deferred.resolve(null);
            }
            for (i = 0, len = datas.length; i < len; i += 1) {
                funcs.push(self.getIsMain(datas[i]));
            }
            Q.all(funcs).then(function(results) {
                var found = false;
                for (i = 0, len = results.length; i < len; i += 1) {
                    if (results[i] === true) {
                        found = true;
                        deferred.resolve(self.processAdaptation(datas[i]));
                    }
                }
                if (!found) {
                    deferred.resolve(datas[0]);
                }
            });
        });
        return deferred.promise;
    },
    getPrimaryTextData: function(manifest, periodIndex) {
        "use strict";
        var i, len, deferred = Q.defer(), funcs = [], self = this;
        this.getTextDatas(manifest, periodIndex).then(function(datas) {
            if (!datas || datas.length === 0) {
                deferred.resolve(null);
            }
            for (i = 0, len = datas.length; i < len; i += 1) {
                funcs.push(self.getIsMain(datas[i]));
            }
            Q.all(funcs).then(function(results) {
                var found = false;
                for (i = 0, len = results.length; i < len; i += 1) {
                    if (results[i] === true) {
                        found = true;
                        deferred.resolve(self.processAdaptation(datas[i]));
                    }
                }
                if (!found) {
                    deferred.resolve(datas[0]);
                }
            });
        });
        return deferred.promise;
    },
    getCodec: function(data) {
        "use strict";
        var representation = data.Representation_asArray[0], codec = representation.mimeType + ';codecs="' + representation.codecs + '"';
        return Q.when(codec);
    },
    getMimeType: function(data) {
        "use strict";
        return Q.when(data.Representation_asArray[0].mimeType);
    },
    getKID: function(data) {
        "use strict";
        if (!data || !data.hasOwnProperty("cenc:default_KID")) {
            return null;
        }
        return data["cenc:default_KID"];
    },
    getContentProtectionData: function(data) {
        "use strict";
        if (!data || !data.hasOwnProperty("ContentProtection_asArray") || data.ContentProtection_asArray.length === 0) {
            return Q.when(null);
        }
        return Q.when(data.ContentProtection_asArray);
    },
    getIsDynamic: function(manifest) {
        "use strict";
        var isDynamic = false, LIVE_TYPE = "dynamic";
        if (manifest.hasOwnProperty("type")) {
            isDynamic = manifest.type === LIVE_TYPE;
        }
        return isDynamic;
    },
    getIsDVR: function(manifest) {
        "use strict";
        var isDynamic = this.getIsDynamic(manifest), containsDVR, isDVR;
        containsDVR = !isNaN(manifest.timeShiftBufferDepth);
        isDVR = isDynamic && containsDVR;
        return Q.when(isDVR);
    },
    getIsOnDemand: function(manifest) {
        "use strict";
        var isOnDemand = false;
        if (manifest.profiles && manifest.profiles.length > 0) {
            isOnDemand = manifest.profiles.indexOf("urn:mpeg:dash:profile:isoff-on-demand:2011") !== -1;
        }
        return Q.when(isOnDemand);
    },
    getDuration: function(manifest) {
        var mpdDuration;
        if (manifest.hasOwnProperty("mediaPresentationDuration")) {
            mpdDuration = manifest.mediaPresentationDuration;
        } else {
            mpdDuration = Number.POSITIVE_INFINITY;
        }
        return Q.when(mpdDuration);
    },
    getBandwidth: function(representation) {
        "use strict";
        return Q.when(representation.bandwidth);
    },
    getRefreshDelay: function(manifest) {
        "use strict";
        var delay = NaN, minDelay = 2;
        if (manifest.hasOwnProperty("minimumUpdatePeriod")) {
            delay = Math.max(parseFloat(manifest.minimumUpdatePeriod), minDelay);
        }
        return Q.when(delay);
    },
    getRepresentationCount: function(adaptation) {
        "use strict";
        return Q.when(adaptation.Representation_asArray.length);
    },
    getRepresentationFor: function(index, data) {
        "use strict";
        return Q.when(data.Representation_asArray[index]);
    },
    getRepresentationsForAdaptation: function(manifest, adaptation) {
        var self = this, a = self.processAdaptation(manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index]), representations = [], deferred = Q.defer(), representation, initialization, segmentInfo, r;
        for (var i = 0; i < a.Representation_asArray.length; i += 1) {
            r = a.Representation_asArray[i];
            representation = new Dash.vo.Representation();
            representation.index = i;
            representation.adaptation = adaptation;
            if (r.hasOwnProperty("id")) {
                representation.id = r.id;
            }
            if (r.hasOwnProperty("SegmentBase")) {
                segmentInfo = r.SegmentBase;
                representation.segmentInfoType = "SegmentBase";
            } else if (r.hasOwnProperty("SegmentList")) {
                segmentInfo = r.SegmentList;
                representation.segmentInfoType = "SegmentList";
                representation.useCalculatedLiveEdgeTime = true;
            } else if (r.hasOwnProperty("SegmentTemplate")) {
                segmentInfo = r.SegmentTemplate;
                if (segmentInfo.hasOwnProperty("SegmentTimeline")) {
                    representation.segmentInfoType = "SegmentTimeline";
                } else {
                    representation.segmentInfoType = "SegmentTemplate";
                }
                if (segmentInfo.hasOwnProperty("initialization")) {
                    representation.initialization = segmentInfo.initialization.split("$Bandwidth$").join(r.bandwidth).split("$RepresentationID$").join(r.id);
                }
            } else {
                segmentInfo = r.BaseURL;
                representation.segmentInfoType = "BaseURL";
            }
            if (segmentInfo.hasOwnProperty("Initialization")) {
                initialization = segmentInfo.Initialization;
                if (initialization.hasOwnProperty("sourceURL")) {
                    representation.initialization = initialization.sourceURL;
                } else if (initialization.hasOwnProperty("range")) {
                    representation.initialization = r.BaseURL;
                    representation.range = initialization.range;
                }
            } else if (r.hasOwnProperty("mimeType") && self.getIsTextTrack(r.mimeType)) {
                representation.initialization = r.BaseURL;
                representation.range = 0;
            }
            if (segmentInfo.hasOwnProperty("timescale")) {
                representation.timescale = segmentInfo.timescale;
            }
            if (segmentInfo.hasOwnProperty("duration")) {
                representation.segmentDuration = segmentInfo.duration / representation.timescale;
            }
            if (segmentInfo.hasOwnProperty("startNumber")) {
                representation.startNumber = segmentInfo.startNumber;
            }
            if (segmentInfo.hasOwnProperty("indexRange")) {
                representation.indexRange = segmentInfo.indexRange;
            }
            if (segmentInfo.hasOwnProperty("presentationTimeOffset")) {
                representation.presentationTimeOffset = segmentInfo.presentationTimeOffset / representation.timescale;
            }
            representation.MSETimeOffset = self.timelineConverter.calcMSETimeOffset(representation);
            representations.push(representation);
        }
        deferred.resolve(representations);
        return deferred.promise;
    },
    getAdaptationsForPeriod: function(manifest, period) {
        var p = manifest.Period_asArray[period.index], adaptations = [], adaptationSet;
        for (var i = 0; i < p.AdaptationSet_asArray.length; i += 1) {
            adaptationSet = new Dash.vo.AdaptationSet();
            adaptationSet.index = i;
            adaptationSet.period = period;
            adaptations.push(adaptationSet);
        }
        return Q.when(adaptations);
    },
    getRegularPeriods: function(manifest, mpd) {
        var self = this, deferred = Q.defer(), periods = [], isDynamic = self.getIsDynamic(manifest), i, len, p1 = null, p = null, vo1 = null, vo = null;
        for (i = 0, len = manifest.Period_asArray.length; i < len; i += 1) {
            p = manifest.Period_asArray[i];
            if (p.hasOwnProperty("start")) {
                vo = new Dash.vo.Period();
                vo.start = p.start;
            } else if (p1 !== null && p.hasOwnProperty("duration")) {
                vo = new Dash.vo.Period();
                vo.start = vo1.start + vo1.duration;
                vo.duration = p.duration;
            } else if (i === 0 && !isDynamic) {
                vo = new Dash.vo.Period();
                vo.start = 0;
            }
            if (vo1 !== null && isNaN(vo1.duration)) {
                vo1.duration = vo.start - vo1.start;
            }
            if (vo !== null && p.hasOwnProperty("id")) {
                vo.id = p.id;
            }
            if (vo !== null && p.hasOwnProperty("duration")) {
                vo.duration = p.duration;
            }
            if (vo !== null) {
                vo.index = i;
                vo.mpd = mpd;
                periods.push(vo);
            }
            p1 = p;
            p = null;
            vo1 = vo;
            vo = null;
        }
        if (periods.length === 0) {
            return Q.when(periods);
        }
        self.getCheckTime(manifest, periods[0]).then(function(checkTime) {
            mpd.checkTime = checkTime;
            if (vo1 !== null && isNaN(vo1.duration)) {
                self.getEndTimeForLastPeriod(mpd).then(function(periodEndTime) {
                    vo1.duration = periodEndTime - vo1.start;
                    deferred.resolve(periods);
                });
            } else {
                deferred.resolve(periods);
            }
        });
        return Q.when(deferred.promise);
    },
    getMpd: function(manifest) {
        var mpd = new Dash.vo.Mpd();
        mpd.manifest = manifest;
        if (manifest.hasOwnProperty("availabilityStartTime")) {
            mpd.availabilityStartTime = new Date(manifest.availabilityStartTime.getTime());
        } else {
            mpd.availabilityStartTime = new Date(manifest.mpdLoadedTime.getTime());
        }
        if (manifest.hasOwnProperty("availabilityEndTime")) {
            mpd.availabilityEndTime = new Date(manifest.availabilityEndTime.getTime());
        }
        if (manifest.hasOwnProperty("suggestedPresentationDelay")) {
            mpd.suggestedPresentationDelay = manifest.suggestedPresentationDelay;
        }
        if (manifest.hasOwnProperty("timeShiftBufferDepth")) {
            mpd.timeShiftBufferDepth = manifest.timeShiftBufferDepth;
        }
        if (manifest.hasOwnProperty("maxSegmentDuration")) {
            mpd.maxSegmentDuration = manifest.maxSegmentDuration;
        }
        return Q.when(mpd);
    },
    getFetchTime: function(manifest, period) {
        var fetchTime = this.timelineConverter.calcPresentationTimeFromWallTime(manifest.mpdLoadedTime, period);
        return Q.when(fetchTime);
    },
    getCheckTime: function(manifest, period) {
        var self = this, deferred = Q.defer(), checkTime = NaN;
        if (manifest.hasOwnProperty("minimumUpdatePeriod")) {
            self.getFetchTime(manifest, period).then(function(fetchTime) {
                checkTime = fetchTime + manifest.minimumUpdatePeriod;
                deferred.resolve(checkTime);
            });
        } else {
            deferred.resolve(checkTime);
        }
        return deferred.promise;
    },
    getEndTimeForLastPeriod: function(mpd) {
        var periodEnd;
        if (mpd.manifest.mediaPresentationDuration) {
            periodEnd = mpd.manifest.mediaPresentationDuration;
        } else if (!isNaN(mpd.checkTime)) {
            periodEnd = mpd.checkTime;
        } else {
            return Q.fail(new Error("Must have @mediaPresentationDuration or @minimumUpdatePeriod on MPD or an explicit @duration on the last period."));
        }
        return Q.when(periodEnd);
    },
    getEventsForPeriod: function(manifest, period) {
        var periodArray = manifest.Period_asArray, eventStreams = periodArray[period.index].EventStream_asArray, events = [];
        if (eventStreams) {
            for (var i = 0; i < eventStreams.length; i += 1) {
                var eventStream = new Dash.vo.EventStream();
                eventStream.period = period;
                eventStream.timescale = 1;
                if (eventStreams[i].hasOwnProperty("schemeIdUri")) {
                    eventStream.schemeIdUri = eventStreams[i].schemeIdUri;
                } else {
                    throw "Invalid EventStream. SchemeIdUri has to be set";
                }
                if (eventStreams[i].hasOwnProperty("timescale")) {
                    eventStream.timescale = eventStreams[i].timescale;
                }
                if (eventStreams[i].hasOwnProperty("value")) {
                    eventStream.value = eventStreams[i].value;
                }
                for (var j = 0; j < eventStreams[i].Event_asArray.length; j += 1) {
                    var event = new Dash.vo.Event();
                    event.presentationTime = 0;
                    event.eventStream = eventStream;
                    if (eventStreams[i].Event_asArray[j].hasOwnProperty("presentationTime")) {
                        event.presentationTime = eventStreams[i].Event_asArray[j].presentationTime;
                    }
                    if (eventStreams[i].Event_asArray[j].hasOwnProperty("duration")) {
                        event.duration = eventStreams[i].Event_asArray[j].duration;
                    }
                    if (eventStreams[i].Event_asArray[j].hasOwnProperty("id")) {
                        event.id = eventStreams[i].Event_asArray[j].id;
                    }
                    events.push(event);
                }
            }
        }
        return Q.when(events);
    },
    getEventStreamForAdaptationSet: function(data) {
        var eventStreams = [], inbandStreams = data.InbandEventStream_asArray;
        if (inbandStreams) {
            for (var i = 0; i < inbandStreams.length; i += 1) {
                var eventStream = new Dash.vo.EventStream();
                eventStream.timescale = 1;
                if (inbandStreams[i].hasOwnProperty("schemeIdUri")) {
                    eventStream.schemeIdUri = inbandStreams[i].schemeIdUri;
                } else {
                    throw "Invalid EventStream. SchemeIdUri has to be set";
                }
                if (inbandStreams[i].hasOwnProperty("timescale")) {
                    eventStream.timescale = inbandStreams[i].timescale;
                }
                if (inbandStreams[i].hasOwnProperty("value")) {
                    eventStream.value = inbandStreams[i].value;
                }
                eventStreams.push(eventStream);
            }
        }
        return eventStreams;
    },
    getEventStreamForRepresentation: function(data, representation) {
        var eventStreams = [], inbandStreams = data.Representation_asArray[representation.index].InbandEventStream_asArray;
        if (inbandStreams) {
            for (var i = 0; i < inbandStreams.length; i++) {
                var eventStream = new Dash.vo.EventStream();
                eventStream.timescale = 1;
                eventStream.representation = representation;
                if (inbandStreams[i].hasOwnProperty("schemeIdUri")) {
                    eventStream.schemeIdUri = inbandStreams[i].schemeIdUri;
                } else {
                    throw "Invalid EventStream. SchemeIdUri has to be set";
                }
                if (inbandStreams[i].hasOwnProperty("timescale")) {
                    eventStream.timescale = inbandStreams[i].timescale;
                }
                if (inbandStreams[i].hasOwnProperty("value")) {
                    eventStream.value = inbandStreams[i].value;
                }
                eventStreams.push(eventStream);
            }
        }
        return eventStreams;
    }
};

Dash.dependencies.DashMetricsExtensions = function() {
    "use strict";
    var findRepresentationIndexInPeriodArray = function(periodArray, representationId) {
        var period, adaptationSet, adaptationSetArray, representation, representationArray, periodArrayIndex, adaptationSetArrayIndex, representationArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
            period = periodArray[periodArrayIndex];
            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                for (representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex = representationArrayIndex + 1) {
                    representation = representationArray[representationArrayIndex];
                    if (representationId === representation.id) {
                        return representationArrayIndex;
                    }
                }
            }
        }
        return -1;
    }, findRepresentionInPeriodArray = function(periodArray, representationId) {
        var period, adaptationSet, adaptationSetArray, representation, representationArray, periodArrayIndex, adaptationSetArrayIndex, representationArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
            period = periodArray[periodArrayIndex];
            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                for (representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex = representationArrayIndex + 1) {
                    representation = representationArray[representationArrayIndex];
                    if (representationId === representation.id) {
                        return representation;
                    }
                }
            }
        }
        return null;
    }, adaptationIsType = function(adaptation, bufferType) {
        var found = false;
        if (bufferType === "video") {
            this.manifestExt.getIsVideo(adaptation);
            if (adaptation.type === "video") {
                found = true;
            }
        } else if (bufferType === "audio") {
            this.manifestExt.getIsAudio(adaptation);
            if (adaptation.type === "audio") {
                found = true;
            }
        } else {
            found = false;
        }
        return found;
    }, findMaxBufferIndex = function(periodArray, bufferType) {
        var period, adaptationSet, adaptationSetArray, representationArray, periodArrayIndex, adaptationSetArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
            period = periodArray[periodArrayIndex];
            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                if (adaptationIsType.call(this, adaptationSet, bufferType)) {
                    return representationArray.length;
                }
            }
        }
        return -1;
    }, getBandwidthForRepresentation = function(representationId) {
        var self = this, manifest = self.manifestModel.getValue(), representation, periodArray = manifest.Period_asArray;
        representation = findRepresentionInPeriodArray.call(self, periodArray, representationId);
        if (representation === null) {
            return null;
        }
        return representation.bandwidth;
    }, getIndexForRepresentation = function(representationId) {
        var self = this, manifest = self.manifestModel.getValue(), representationIndex, periodArray = manifest.Period_asArray;
        representationIndex = findRepresentationIndexInPeriodArray.call(self, periodArray, representationId);
        return representationIndex;
    }, getMaxIndexForBufferType = function(bufferType) {
        var self = this, manifest = self.manifestModel.getValue(), maxIndex, periodArray = manifest.Period_asArray;
        maxIndex = findMaxBufferIndex.call(this, periodArray, bufferType);
        return maxIndex;
    }, getCurrentRepresentationSwitch = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var repSwitch = metrics.RepSwitchList, repSwitchLength, repSwitchLastIndex, currentRepSwitch;
        if (repSwitch === null || repSwitch.length <= 0) {
            return null;
        }
        repSwitchLength = repSwitch.length;
        repSwitchLastIndex = repSwitchLength - 1;
        currentRepSwitch = repSwitch[repSwitchLastIndex];
        return currentRepSwitch;
    }, getCurrentBufferLevel = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var bufferLevel = metrics.BufferLevel, bufferLevelLength, bufferLevelLastIndex, currentBufferLevel;
        if (bufferLevel === null || bufferLevel.length <= 0) {
            return null;
        }
        bufferLevelLength = bufferLevel.length;
        bufferLevelLastIndex = bufferLevelLength - 1;
        currentBufferLevel = bufferLevel[bufferLevelLastIndex];
        return currentBufferLevel;
    }, getCurrentHttpRequest = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var httpList = metrics.HttpList, httpListLength, httpListLastIndex, currentHttpList = null;
        if (httpList === null || httpList.length <= 0) {
            return null;
        }
        httpListLength = httpList.length;
        httpListLastIndex = httpListLength - 1;
        while (httpListLastIndex >= 0) {
            if (httpList[httpListLastIndex].responsecode) {
                currentHttpList = httpList[httpListLastIndex];
                break;
            }
            httpListLastIndex -= 1;
        }
        return currentHttpList;
    }, getHttpRequests = function(metrics) {
        if (metrics === null) {
            return [];
        }
        return !!metrics.HttpList ? metrics.HttpList : [];
    }, getCurrentDroppedFrames = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var droppedFrames = metrics.DroppedFrames, droppedFramesLength, droppedFramesLastIndex, currentDroppedFrames;
        if (droppedFrames === null || droppedFrames.length <= 0) {
            return null;
        }
        droppedFramesLength = droppedFrames.length;
        droppedFramesLastIndex = droppedFramesLength - 1;
        currentDroppedFrames = droppedFrames[droppedFramesLastIndex];
        return currentDroppedFrames;
    }, getCurrentDVRInfo = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var dvrInfo = metrics.DVRInfo, dvrInfoLastIndex, curentDVRInfo = null;
        if (dvrInfo === null || dvrInfo.length <= 0) {
            return null;
        }
        dvrInfoLastIndex = dvrInfo.length - 1;
        curentDVRInfo = dvrInfo[dvrInfoLastIndex];
        return curentDVRInfo;
    }, getCurrentManifestUpdate = function(metrics) {
        if (metrics === null) return null;
        var manifestUpdate = metrics.ManifestUpdate, ln, lastIdx, currentManifestUpdate;
        if (manifestUpdate === null || manifestUpdate.length <= 0) {
            return null;
        }
        ln = manifestUpdate.length;
        lastIdx = ln - 1;
        currentManifestUpdate = manifestUpdate[lastIdx];
        return currentManifestUpdate;
    };
    return {
        manifestModel: undefined,
        manifestExt: undefined,
        getBandwidthForRepresentation: getBandwidthForRepresentation,
        getIndexForRepresentation: getIndexForRepresentation,
        getMaxIndexForBufferType: getMaxIndexForBufferType,
        getCurrentRepresentationSwitch: getCurrentRepresentationSwitch,
        getCurrentBufferLevel: getCurrentBufferLevel,
        getCurrentHttpRequest: getCurrentHttpRequest,
        getHttpRequests: getHttpRequests,
        getCurrentDroppedFrames: getCurrentDroppedFrames,
        getCurrentDVRInfo: getCurrentDVRInfo,
        getCurrentManifestUpdate: getCurrentManifestUpdate
    };
};

Dash.dependencies.DashMetricsExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsExtensions
};

Dash.dependencies.DashParser = function() {
    "use strict";
    var SECONDS_IN_YEAR = 365 * 24 * 60 * 60, SECONDS_IN_MONTH = 30 * 24 * 60 * 60, SECONDS_IN_DAY = 24 * 60 * 60, SECONDS_IN_HOUR = 60 * 60, SECONDS_IN_MIN = 60, MINUTES_IN_HOUR = 60, MILLISECONDS_IN_SECONDS = 1e3, durationRegex = /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/, datetimeRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]*)(\.[0-9]*)?)?(?:([+-])([0-9]{2})([0-9]{2}))?/, numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/, matchers = [ {
        type: "duration",
        test: function(str) {
            return durationRegex.test(str);
        },
        converter: function(str) {
            var match = durationRegex.exec(str);
            return parseFloat(match[2] || 0) * SECONDS_IN_YEAR + parseFloat(match[4] || 0) * SECONDS_IN_MONTH + parseFloat(match[6] || 0) * SECONDS_IN_DAY + parseFloat(match[8] || 0) * SECONDS_IN_HOUR + parseFloat(match[10] || 0) * SECONDS_IN_MIN + parseFloat(match[12] || 0);
        }
    }, {
        type: "datetime",
        test: function(str) {
            return datetimeRegex.test(str);
        },
        converter: function(str) {
            var match = datetimeRegex.exec(str), utcDate;
            utcDate = Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), parseInt(match[4], 10), parseInt(match[5], 10), match[6] && parseInt(match[6], 10) || 0, match[7] && parseFloat(match[7]) * MILLISECONDS_IN_SECONDS || 0);
            if (match[9] && match[10]) {
                var timezoneOffset = parseInt(match[9], 10) * MINUTES_IN_HOUR + parseInt(match[10], 10);
                utcDate += (match[8] === "+" ? -1 : +1) * timezoneOffset * SECONDS_IN_MIN * MILLISECONDS_IN_SECONDS;
            }
            return new Date(utcDate);
        }
    }, {
        type: "numeric",
        test: function(str) {
            return numericRegex.test(str);
        },
        converter: function(str) {
            return parseFloat(str);
        }
    } ], getCommonValuesMap = function() {
        var adaptationSet, representation, subRepresentation, common;
        common = [ {
            name: "profiles",
            merge: false
        }, {
            name: "width",
            merge: false
        }, {
            name: "height",
            merge: false
        }, {
            name: "sar",
            merge: false
        }, {
            name: "frameRate",
            merge: false
        }, {
            name: "audioSamplingRate",
            merge: false
        }, {
            name: "mimeType",
            merge: false
        }, {
            name: "segmentProfiles",
            merge: false
        }, {
            name: "codecs",
            merge: false
        }, {
            name: "maximumSAPPeriod",
            merge: false
        }, {
            name: "startsWithSap",
            merge: false
        }, {
            name: "maxPlayoutRate",
            merge: false
        }, {
            name: "codingDependency",
            merge: false
        }, {
            name: "scanType",
            merge: false
        }, {
            name: "FramePacking",
            merge: true
        }, {
            name: "AudioChannelConfiguration",
            merge: true
        }, {
            name: "ContentProtection",
            merge: true
        } ];
        adaptationSet = {};
        adaptationSet.name = "AdaptationSet";
        adaptationSet.isRoot = false;
        adaptationSet.isArray = true;
        adaptationSet.parent = null;
        adaptationSet.children = [];
        adaptationSet.properties = common;
        representation = {};
        representation.name = "Representation";
        representation.isRoot = false;
        representation.isArray = true;
        representation.parent = adaptationSet;
        representation.children = [];
        representation.properties = common;
        adaptationSet.children.push(representation);
        subRepresentation = {};
        subRepresentation.name = "SubRepresentation";
        subRepresentation.isRoot = false;
        subRepresentation.isArray = true;
        subRepresentation.parent = representation;
        subRepresentation.children = [];
        subRepresentation.properties = common;
        representation.children.push(subRepresentation);
        return adaptationSet;
    }, getSegmentValuesMap = function() {
        var period, adaptationSet, representation, common;
        common = [ {
            name: "SegmentBase",
            merge: true
        }, {
            name: "SegmentTemplate",
            merge: true
        }, {
            name: "SegmentList",
            merge: true
        } ];
        period = {};
        period.name = "Period";
        period.isRoot = false;
        period.isArray = true;
        period.parent = null;
        period.children = [];
        period.properties = common;
        adaptationSet = {};
        adaptationSet.name = "AdaptationSet";
        adaptationSet.isRoot = false;
        adaptationSet.isArray = true;
        adaptationSet.parent = period;
        adaptationSet.children = [];
        adaptationSet.properties = common;
        period.children.push(adaptationSet);
        representation = {};
        representation.name = "Representation";
        representation.isRoot = false;
        representation.isArray = true;
        representation.parent = adaptationSet;
        representation.children = [];
        representation.properties = common;
        adaptationSet.children.push(representation);
        return period;
    }, getBaseUrlValuesMap = function() {
        var mpd, period, adaptationSet, representation, common;
        common = [ {
            name: "BaseURL",
            merge: true,
            mergeFunction: function(parentValue, childValue) {
                var mergedValue;
                if (childValue.indexOf("http://") === 0) {
                    mergedValue = childValue;
                } else {
                    mergedValue = parentValue + childValue;
                }
                return mergedValue;
            }
        } ];
        mpd = {};
        mpd.name = "mpd";
        mpd.isRoot = true;
        mpd.isArray = true;
        mpd.parent = null;
        mpd.children = [];
        mpd.properties = common;
        period = {};
        period.name = "Period";
        period.isRoot = false;
        period.isArray = true;
        period.parent = null;
        period.children = [];
        period.properties = common;
        mpd.children.push(period);
        adaptationSet = {};
        adaptationSet.name = "AdaptationSet";
        adaptationSet.isRoot = false;
        adaptationSet.isArray = true;
        adaptationSet.parent = period;
        adaptationSet.children = [];
        adaptationSet.properties = common;
        period.children.push(adaptationSet);
        representation = {};
        representation.name = "Representation";
        representation.isRoot = false;
        representation.isArray = true;
        representation.parent = adaptationSet;
        representation.children = [];
        representation.properties = common;
        adaptationSet.children.push(representation);
        return mpd;
    }, getDashMap = function() {
        var result = [];
        result.push(getCommonValuesMap());
        result.push(getSegmentValuesMap());
        result.push(getBaseUrlValuesMap());
        return result;
    }, internalParse = function(data, baseUrl) {
        var manifest, converter = new X2JS(matchers, "", true), iron = new ObjectIron(getDashMap()), start = new Date(), json = null, ironed = null;
        try {
            manifest = converter.xml_str2json(data);
            json = new Date();
            if (!manifest.hasOwnProperty("BaseURL")) {
                manifest.BaseURL = baseUrl;
            } else {
                manifest.BaseURL = manifest.BaseURL_asArray[0];
                if (manifest.BaseURL.toString().indexOf("http") !== 0) {
                    manifest.BaseURL = baseUrl + manifest.BaseURL;
                }
            }
            iron.run(manifest);
            ironed = new Date();
            this.debug.log("Parsing complete: ( xml2json: " + (json.getTime() - start.getTime()) + "ms, objectiron: " + (ironed.getTime() - json.getTime()) + "ms, total: " + (ironed.getTime() - start.getTime()) / 1e3 + "s)");
        } catch (err) {
            this.errHandler.manifestError("parsing the manifest failed", "parse", data);
            return Q.reject(err);
        }
        return Q.when(manifest);
    };
    return {
        debug: undefined,
        errHandler: undefined,
        parse: internalParse
    };
};

Dash.dependencies.DashParser.prototype = {
    constructor: Dash.dependencies.DashParser
};

Dash.dependencies.FragmentExtensions = function() {
    "use strict";
    var parseTFDT = function(ab) {
        var deferred = Q.defer(), d = new DataView(ab), pos = 0, base_media_decode_time, version, size, type, i, c;
        while (type !== "tfdt" && pos < d.byteLength) {
            size = d.getUint32(pos);
            pos += 4;
            type = "";
            for (i = 0; i < 4; i += 1) {
                c = d.getInt8(pos);
                type += String.fromCharCode(c);
                pos += 1;
            }
            if (type !== "moof" && type !== "traf" && type !== "tfdt") {
                pos += size - 8;
            }
        }
        if (pos === d.byteLength) {
            throw "Error finding live offset.";
        }
        version = d.getUint8(pos);
        this.debug.log("position: " + pos);
        if (version === 0) {
            pos += 4;
            base_media_decode_time = d.getUint32(pos, false);
        } else {
            pos += size - 16;
            base_media_decode_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
        }
        deferred.resolve({
            version: version,
            base_media_decode_time: base_media_decode_time
        });
        return deferred.promise;
    }, parseSIDX = function(ab) {
        var d = new DataView(ab), pos = 0, version, timescale, earliest_presentation_time, i, type, size, charCode;
        while (type !== "sidx" && pos < d.byteLength) {
            size = d.getUint32(pos);
            pos += 4;
            type = "";
            for (i = 0; i < 4; i += 1) {
                charCode = d.getInt8(pos);
                type += String.fromCharCode(charCode);
                pos += 1;
            }
            if (type !== "moof" && type !== "traf" && type !== "sidx") {
                pos += size - 8;
            } else if (type === "sidx") {
                pos -= 8;
            }
        }
        version = d.getUint8(pos + 8);
        pos += 12;
        timescale = d.getUint32(pos + 4, false);
        pos += 8;
        if (version === 0) {
            earliest_presentation_time = d.getUint32(pos, false);
        } else {
            earliest_presentation_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
        }
        return Q.when({
            earliestPresentationTime: earliest_presentation_time,
            timescale: timescale
        });
    }, loadFragment = function(media) {
        var deferred = Q.defer(), request = new XMLHttpRequest(), url, loaded = false, errorStr, parsed;
        url = media;
        request.onloadend = function() {
            if (!loaded) {
                errorStr = "Error loading fragment: " + url;
                deferred.reject(errorStr);
            }
        };
        request.onload = function() {
            loaded = true;
            parsed = parseTFDT(request.response);
            deferred.resolve(parsed);
        };
        request.onerror = function() {
            errorStr = "Error loading fragment: " + url;
            deferred.reject(errorStr);
        };
        request.responseType = "arraybuffer";
        request.open("GET", url);
        request.send(null);
        return deferred.promise;
    };
    return {
        debug: undefined,
        loadFragment: loadFragment,
        parseTFDT: parseTFDT,
        parseSIDX: parseSIDX
    };
};

Dash.dependencies.FragmentExtensions.prototype = {
    constructor: Dash.dependencies.FragmentExtensions
};

Dash.dependencies.TimelineConverter = function() {
    "use strict";
    var clientServerTimeShift = 0, calcAvailabilityTimeFromPresentationTime = function(presentationTime, mpd, isDynamic, calculateEnd) {
        var availabilityTime = NaN;
        if (calculateEnd) {
            if (isDynamic && mpd.timeShiftBufferDepth != Number.POSITIVE_INFINITY) {
                availabilityTime = new Date(mpd.availabilityStartTime.getTime() + (presentationTime + mpd.timeShiftBufferDepth) * 1e3);
            } else {
                availabilityTime = mpd.availabilityEndTime;
            }
        } else {
            if (isDynamic) {
                availabilityTime = new Date(mpd.availabilityStartTime.getTime() + presentationTime * 1e3);
            } else {
                availabilityTime = mpd.availabilityStartTime;
            }
        }
        return availabilityTime;
    }, calcAvailabilityStartTimeFromPresentationTime = function(presentationTime, mpd, isDynamic) {
        return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic);
    }, calcAvailabilityEndTimeFromPresentationTime = function(presentationTime, mpd, isDynamic) {
        return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic, true);
    }, calcPresentationStartTime = function(period) {
        var presentationStartTime, isDynamic = period.mpd.manifest.type === "dynamic", startTimeOffset = parseInt(this.uriQueryFragModel.getURIFragmentData().s, 10);
        if (isDynamic) {
            if (!isNaN(startTimeOffset) && startTimeOffset > 1262304e3) {
                presentationStartTime = startTimeOffset - period.mpd.availabilityStartTime.getTime() / 1e3;
                if (presentationStartTime > period.liveEdge || presentationStartTime < period.liveEdge - period.mpd.timeShiftBufferDepth) {
                    presentationStartTime = null;
                }
            }
            presentationStartTime = presentationStartTime || period.liveEdge;
        } else {
            if (!isNaN(startTimeOffset) && startTimeOffset < period.duration && startTimeOffset >= 0) {
                presentationStartTime = startTimeOffset;
            } else {
                presentationStartTime = period.start;
            }
        }
        return presentationStartTime;
    }, calcPresentationTimeFromWallTime = function(wallTime, period) {
        return (wallTime.getTime() - period.mpd.availabilityStartTime.getTime()) / 1e3;
    }, calcPresentationTimeFromMediaTime = function(mediaTime, representation) {
        var presentationOffset = representation.presentationTimeOffset;
        return mediaTime - presentationOffset;
    }, calcMediaTimeFromPresentationTime = function(presentationTime, representation) {
        var presentationOffset = representation.presentationTimeOffset;
        return presentationOffset + presentationTime;
    }, calcWallTimeForSegment = function(segment, isDynamic) {
        var suggestedPresentationDelay, displayStartTime, wallTime;
        if (isDynamic) {
            suggestedPresentationDelay = segment.representation.adaptation.period.mpd.suggestedPresentationDelay;
            displayStartTime = segment.presentationStartTime + suggestedPresentationDelay;
            wallTime = new Date(segment.availabilityStartTime.getTime() + displayStartTime * 1e3);
        }
        return wallTime;
    }, calcActualPresentationTime = function(representation, currentTime, isDynamic) {
        var self = this, availabilityWindow = self.calcSegmentAvailabilityRange(representation, isDynamic), actualTime;
        if (currentTime >= availabilityWindow.start && currentTime <= availabilityWindow.end) {
            return currentTime;
        }
        actualTime = Math.max(availabilityWindow.end - representation.adaptation.period.mpd.manifest.minBufferTime * 2, availabilityWindow.start);
        return actualTime;
    }, calcSegmentAvailabilityRange = function(representation, isDynamic) {
        var duration = representation.segmentDuration, start = 0, end = representation.adaptation.period.duration, range = {
            start: start,
            end: end
        }, checkTime, now;
        if (!isDynamic) return range;
        if ((!representation.adaptation.period.mpd.isClientServerTimeSyncCompleted || isNaN(duration)) && representation.segmentAvailabilityRange) {
            return representation.segmentAvailabilityRange;
        }
        checkTime = representation.adaptation.period.mpd.checkTime;
        now = calcPresentationTimeFromWallTime(new Date(new Date().getTime() + clientServerTimeShift), representation.adaptation.period);
        start = Math.max(now - representation.adaptation.period.mpd.timeShiftBufferDepth, 0);
        checkTime += clientServerTimeShift / 1e3;
        end = isNaN(checkTime) ? now : Math.min(checkTime, now);
        range = {
            start: start,
            end: end
        };
        return range;
    }, calcMSETimeOffset = function(representation) {
        var presentationOffset = representation.presentationTimeOffset;
        return -presentationOffset;
    };
    return {
        system: undefined,
        debug: undefined,
        uriQueryFragModel: undefined,
        setup: function() {},
        calcAvailabilityStartTimeFromPresentationTime: calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime: calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime: calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime: calcPresentationTimeFromMediaTime,
        calcPresentationStartTime: calcPresentationStartTime,
        calcActualPresentationTime: calcActualPresentationTime,
        calcMediaTimeFromPresentationTime: calcMediaTimeFromPresentationTime,
        calcSegmentAvailabilityRange: calcSegmentAvailabilityRange,
        calcWallTimeForSegment: calcWallTimeForSegment,
        calcMSETimeOffset: calcMSETimeOffset
    };
};

Dash.dependencies.TimelineConverter.prototype = {
    constructor: Dash.dependencies.TimelineConverter
};

Dash.vo.AdaptationSet = function() {
    "use strict";
    this.period = null;
    this.index = -1;
};

Dash.vo.AdaptationSet.prototype = {
    constructor: Dash.vo.AdaptationSet
};

Dash.vo.Event = function() {
    "use strict";
    this.duration = NaN;
    this.presentationTime = NaN;
    this.id = NaN;
    this.messageData = "";
    this.eventStream = null;
    this.presentationTimeDelta = NaN;
};

Dash.vo.Event.prototype = {
    constructor: Dash.vo.Event
};

Dash.vo.EventStream = function() {
    "use strict";
    this.adaptionSet = null;
    this.representation = null;
    this.period = null;
    this.timescale = 1;
    this.value = "";
    this.schemeIdUri = "";
};

Dash.vo.EventStream.prototype = {
    constructor: Dash.vo.EventStream
};

Dash.vo.Mpd = function() {
    "use strict";
    this.manifest = null;
    this.suggestedPresentationDelay = 0;
    this.availabilityStartTime = null;
    this.availabilityEndTime = Number.POSITIVE_INFINITY;
    this.timeShiftBufferDepth = Number.POSITIVE_INFINITY;
    this.maxSegmentDuration = Number.POSITIVE_INFINITY;
    this.checkTime = NaN;
    this.clientServerTimeShift = 0;
    this.isClientServerTimeSyncCompleted = false;
};

Dash.vo.Mpd.prototype = {
    constructor: Dash.vo.Mpd
};

Dash.vo.Period = function() {
    "use strict";
    this.id = null;
    this.index = -1;
    this.duration = NaN;
    this.start = NaN;
    this.mpd = null;
    this.liveEdge = NaN;
};

Dash.vo.Period.prototype = {
    constructor: Dash.vo.Period
};

Dash.vo.Representation = function() {
    "use strict";
    this.id = null;
    this.index = -1;
    this.adaptation = null;
    this.segmentInfoType = null;
    this.initialization = null;
    this.segmentDuration = NaN;
    this.timescale = 1;
    this.startNumber = 1;
    this.indexRange = null;
    this.range = null;
    this.presentationTimeOffset = 0;
    this.MSETimeOffset = NaN;
    this.segmentAvailabilityRange = null;
    this.availableSegmentsNumber = 0;
};

Dash.vo.Representation.prototype = {
    constructor: Dash.vo.Representation
};

Dash.vo.Segment = function() {
    "use strict";
    this.indexRange = null;
    this.index = null;
    this.mediaRange = null;
    this.media = null;
    this.duration = NaN;
    this.replacementTime = null;
    this.replacementNumber = NaN;
    this.mediaStartTime = NaN;
    this.presentationStartTime = NaN;
    this.availabilityStartTime = NaN;
    this.availabilityEndTime = NaN;
    this.availabilityIdx = NaN;
    this.wallStartTime = NaN;
    this.representation = null;
};

Dash.vo.Segment.prototype = {
    constructor: Dash.vo.Segment
};

MediaPlayer.dependencies.AbrController = function() {
    "use strict";
    var autoSwitchBitrate = true, qualityDict = {}, confidenceDict = {}, getInternalQuality = function(type) {
        var quality;
        if (!qualityDict.hasOwnProperty(type)) {
            qualityDict[type] = 0;
        }
        quality = qualityDict[type];
        return quality;
    }, setInternalQuality = function(type, value) {
        qualityDict[type] = value;
    }, getInternalConfidence = function(type) {
        var confidence;
        if (!confidenceDict.hasOwnProperty(type)) {
            confidenceDict[type] = 0;
        }
        confidence = confidenceDict[type];
        return confidence;
    }, setInternalConfidence = function(type, value) {
        confidenceDict[type] = value;
    };
    return {
        debug: undefined,
        abrRulesCollection: undefined,
        manifestExt: undefined,
        metricsModel: undefined,
        getAutoSwitchBitrate: function() {
            return autoSwitchBitrate;
        },
        setAutoSwitchBitrate: function(value) {
            autoSwitchBitrate = value;
        },
        getMetricsFor: function(data) {
            var deferred = Q.defer(), self = this;
            self.manifestExt.getIsVideo(data).then(function(isVideo) {
                if (isVideo) {
                    deferred.resolve(self.metricsModel.getMetricsFor("video"));
                } else {
                    self.manifestExt.getIsAudio(data).then(function(isAudio) {
                        if (isAudio) {
                            deferred.resolve(self.metricsModel.getMetricsFor("audio"));
                        } else {
                            deferred.resolve(self.metricsModel.getMetricsFor("stream"));
                        }
                    });
                }
            });
            return deferred.promise;
        },
        getPlaybackQuality: function(type, data) {
            var self = this, deferred = Q.defer(), newQuality = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, newConfidence = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, i, len, funcs = [], req, values, quality, confidence;
            quality = getInternalQuality(type);
            confidence = getInternalConfidence(type);
            if (autoSwitchBitrate) {
                self.debug.log("[AbrController][" + type + "] Check rules....");
                self.getMetricsFor(data).then(function(metrics) {
                    self.abrRulesCollection.getRules().then(function(rules) {
                        for (i = 0, len = rules.length; i < len; i += 1) {
                            funcs.push(rules[i].checkIndex(quality, metrics, data));
                        }
                        Q.all(funcs).then(function(results) {
                            values = {};
                            values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
                            values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
                            values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
                            for (i = 0, len = results.length; i < len; i += 1) {
                                req = results[i];
                                self.debug.log("[AbrController][" + type + "] Request for quality " + req.quality + ", priority = " + req.priority);
                                if (req.quality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                                    values[req.priority] = Math.min(values[req.priority], req.quality);
                                }
                            }
                            if (values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.WEAK;
                                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK];
                            }
                            if (values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT];
                            }
                            if (values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG];
                            }
                            if (newQuality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && newQuality !== undefined) {
                                quality = newQuality;
                            }
                            if (newConfidence !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && newConfidence !== undefined) {
                                confidence = newConfidence;
                            }
                            self.manifestExt.getRepresentationCount(data).then(function(max) {
                                if (quality < 0) {
                                    quality = 0;
                                }
                                if (quality >= max) {
                                    quality = max - 1;
                                }
                                if (confidence != MediaPlayer.rules.SwitchRequest.prototype.STRONG && confidence != MediaPlayer.rules.SwitchRequest.prototype.WEAK) {
                                    confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                                }
                                self.debug.log("[AbrController][" + type + "] Set quality: " + quality);
                                setInternalQuality(type, quality);
                                setInternalConfidence(type, confidence);
                                deferred.resolve({
                                    quality: quality,
                                    confidence: confidence
                                });
                            });
                        });
                    });
                });
            } else {
                deferred.resolve({
                    quality: quality,
                    confidence: confidence
                });
            }
            return deferred.promise;
        },
        setPlaybackQuality: function(type, newPlaybackQuality) {
            var quality = getInternalQuality(type);
            this.debug.log("[AbrController][" + type + "] Set playback quality: " + newPlaybackQuality);
            if (newPlaybackQuality !== quality) {
                setInternalQuality(type, newPlaybackQuality);
            }
        },
        getQualityFor: function(type) {
            return getInternalQuality(type);
        }
    };
};

MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
};

MediaPlayer.dependencies.BufferController = function() {
    "use strict";
    var STALL_THRESHOLD = .5, QUOTA_EXCEEDED_ERROR_CODE = 22, WAITING = "WAITING", READY = "READY", VALIDATING = "VALIDATING", LOADING = "LOADING", state = WAITING, ready = false, started = false, waitingForBuffer = false, initialPlayback = true, initializationData = [], seeking = false, seekTarget = -1, dataChanged = true, availableRepresentations, currentRepresentation, playingTime, requiredQuality = -1, currentQuality = -1, stalled = false, isDynamic = false, isBufferingCompleted = false, deferredAppends = [], deferredInitAppend = null, deferredStreamComplete = Q.defer(), deferredRejectedDataAppend = null, deferredBuffersFlatten = null, periodInfo = null, fragmentsToLoad = 0, fragmentModel = null, bufferLevel = 0, isQuotaExceeded = false, rejectedBytes = null, fragmentDuration = 0, appendingRejectedData = false, mediaSource, timeoutId = null, liveEdgeSearchRange = null, liveEdgeInitialSearchPosition = null, liveEdgeSearchStep = null, deferredLiveEdge, useBinarySearch = false, type, data = null, buffer = null, minBufferTime, playListMetrics = null, playListTraceMetrics = null, playListTraceMetricsClosed = true, inbandEventFound = false, setState = function(value) {
        var self = this;
        state = value;
        if (fragmentModel !== null) {
            self.fragmentController.onBufferControllerStateChange();
        }
    }, clearPlayListTraceMetrics = function(endTime, stopreason) {
        var duration = 0, startTime = null;
        if (playListTraceMetricsClosed === false) {
            startTime = playListTraceMetrics.start;
            duration = endTime.getTime() - startTime.getTime();
            playListTraceMetrics.duration = duration;
            playListTraceMetrics.stopreason = stopreason;
            playListTraceMetricsClosed = true;
        }
    }, startPlayback = function() {
        if (!ready || !started) {
            return;
        }
        setState.call(this, READY);
        this.requestScheduler.startScheduling(this, validate);
        fragmentModel = this.fragmentController.attachBufferController(this);
    }, doStart = function() {
        var currentTime;
        if (this.requestScheduler.isScheduled(this)) {
            return;
        }
        if (seeking === false) {
            currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
        }
        this.debug.log("BufferController " + type + " start.");
        started = true;
        waitingForBuffer = true;
        startPlayback.call(this);
    }, doSeek = function(time) {
        var currentTime;
        this.debug.log("BufferController " + type + " seek: " + time);
        seeking = true;
        seekTarget = time;
        currentTime = new Date();
        clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
        playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
        doStart.call(this);
    }, doStop = function() {
        if (state === WAITING) return;
        this.debug.log("BufferController " + type + " stop.");
        setState.call(this, isBufferingCompleted ? READY : WAITING);
        this.requestScheduler.stopScheduling(this);
        this.fragmentController.cancelPendingRequestsForModel(fragmentModel);
        started = false;
        waitingForBuffer = false;
        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
    }, updateRepresentations = function(data, periodInfo) {
        var self = this, deferred = Q.defer(), manifest = self.manifestModel.getValue();
        self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(function(idx) {
            self.manifestExt.getAdaptationsForPeriod(manifest, periodInfo).then(function(adaptations) {
                self.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[idx]).then(function(representations) {
                    deferred.resolve(representations);
                });
            });
        });
        return deferred.promise;
    }, getRepresentationForQuality = function(quality) {
        return availableRepresentations[quality];
    }, finishValidation = function() {
        var self = this;
        if (state === LOADING) {
            if (stalled) {
                stalled = false;
                this.videoModel.stallStream(type, stalled);
            }
            setState.call(self, READY);
        }
    }, onBytesLoadingStart = function(request) {
        if (this.fragmentController.isInitializationRequest(request)) {
            setState.call(this, READY);
        } else {
            setState.call(this, LOADING);
            var self = this, time = self.fragmentController.getLoadingTime(self);
            if (timeoutId !== null) return;
            timeoutId = setTimeout(function() {
                if (!hasData()) return;
                setState.call(self, READY);
                requestNewFragment.call(self);
                timeoutId = null;
            }, time);
        }
    }, onBytesLoaded = function(request, response) {
        if (this.fragmentController.isInitializationRequest(request)) {
            onInitializationLoaded.call(this, request, response);
        } else {
            onMediaLoaded.call(this, request, response);
        }
    }, onMediaLoaded = function(request, response) {
        var self = this, currentRepresentation = getRepresentationForQuality.call(self, request.quality), eventStreamAdaption = this.manifestExt.getEventStreamForAdaptationSet(self.getData()), eventStreamRepresentation = this.manifestExt.getEventStreamForRepresentation(self.getData(), currentRepresentation);
        if (!fragmentDuration && !isNaN(request.duration)) {
            fragmentDuration = request.duration;
        }
        self.fragmentController.process(response.data).then(function(data) {
            if (data !== null && deferredInitAppend !== null) {
                if (eventStreamAdaption.length > 0 || eventStreamRepresentation.length > 0) {
                    handleInbandEvents.call(self, data, request, eventStreamAdaption, eventStreamRepresentation).then(function(events) {
                        self.eventController.addInbandEvents(events);
                    });
                }
                Q.when(deferredInitAppend.promise).then(function() {
                    deleteInbandEvents.call(self, data).then(function(data) {
                        appendToBuffer.call(self, data, request.quality, request.index).then(function() {
                            deferredStreamComplete.promise.then(function(lastRequest) {
                                if (lastRequest.index - 1 === request.index && !isBufferingCompleted) {
                                    isBufferingCompleted = true;
                                    if (stalled) {
                                        stalled = false;
                                        self.videoModel.stallStream(type, stalled);
                                    }
                                    setState.call(self, READY);
                                    self.system.notify("bufferingCompleted");
                                }
                            });
                        });
                    });
                });
            } else {
                self.debug.log("No " + type + " bytes to push.");
            }
        });
    }, appendToBuffer = function(data, quality, index) {
        var self = this, req, isInit = index === undefined, isAppendingRejectedData = rejectedBytes && data == rejectedBytes.data, deferred = isAppendingRejectedData ? deferredRejectedDataAppend : Q.defer(), ln = isAppendingRejectedData ? deferredAppends.length : deferredAppends.push(deferred), currentVideoTime = self.videoModel.getCurrentTime(), currentTime = new Date();
        if (playListTraceMetricsClosed === true && state !== WAITING && requiredQuality !== -1) {
            playListTraceMetricsClosed = false;
            playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentRepresentation.id, null, currentTime, currentVideoTime, null, 1, null);
        }
        Q.when(isAppendingRejectedData || ln < 2 || deferredAppends[ln - 2].promise).then(function() {
            if (!hasData()) return;
            hasEnoughSpaceToAppend.call(self).then(function() {
                if (quality !== requiredQuality && isInit || quality !== currentQuality && !isInit) {
                    req = fragmentModel.getExecutedRequestForQualityAndIndex(quality, index);
                    if (req) {
                        window.removed = req;
                        fragmentModel.removeExecutedRequest(req);
                        if (!isInit) {
                            self.indexHandler.getSegmentRequestForTime(currentRepresentation, req.startTime).then(onFragmentRequest.bind(self));
                        }
                    }
                    deferred.resolve();
                    if (isAppendingRejectedData) {
                        deferredRejectedDataAppend = null;
                        rejectedBytes = null;
                    }
                    return;
                }
                Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : true).then(function() {
                    if (!hasData()) return;
                    self.sourceBufferExt.append(buffer, data, self.videoModel).then(function() {
                        if (isAppendingRejectedData) {
                            deferredRejectedDataAppend = null;
                            rejectedBytes = null;
                        }
                        if (isInit) {
                            currentQuality = quality;
                        }
                        if (!self.requestScheduler.isScheduled(self) && isSchedulingRequired.call(self)) {
                            doStart.call(self);
                        }
                        isQuotaExceeded = false;
                        updateBufferLevel.call(self).then(function() {
                            deferred.resolve();
                        });
                        self.sourceBufferExt.getAllRanges(buffer).then(function(ranges) {
                            if (ranges) {
                                if (ranges.length > 0) {
                                    var i, len;
                                    for (i = 0, len = ranges.length; i < len; i += 1) {
                                        self.debug.log("Buffered " + type + " Range: " + ranges.start(i) + " - " + ranges.end(i));
                                    }
                                }
                            }
                        });
                    }, function(result) {
                        if (result.err.code === QUOTA_EXCEEDED_ERROR_CODE) {
                            rejectedBytes = {
                                data: data,
                                quality: quality,
                                index: index
                            };
                            deferredRejectedDataAppend = deferred;
                            isQuotaExceeded = true;
                            fragmentsToLoad = 0;
                            doStop.call(self);
                        }
                    });
                });
            });
        });
        return deferred.promise;
    }, updateBufferLevel = function() {
        if (!hasData()) return Q.when(false);
        var self = this, deferred = Q.defer(), currentTime = getWorkingTime.call(self);
        self.manifestExt.getMpd(self.manifestModel.getValue()).then(function(mpd) {
            var range = self.timelineConverter.calcSegmentAvailabilityRange(currentRepresentation, isDynamic);
            self.metricsModel.addDVRInfo(type, currentTime, mpd, range);
        });
        self.sourceBufferExt.getBufferLength(buffer, currentTime).then(function(bufferLength) {
            if (!hasData()) {
                deferred.reject();
                return;
            }
            bufferLevel = bufferLength;
            self.metricsModel.addBufferLevel(type, new Date(), bufferLevel);
            checkGapBetweenBuffers.call(self);
            checkIfSufficientBuffer.call(self);
            deferred.resolve();
        });
        return deferred.promise;
    }, handleInbandEvents = function(data, request, adaptionSetInbandEvents, representationInbandEvents) {
        var events = [], i = 0, identifier, size, expTwo = Math.pow(256, 2), expThree = Math.pow(256, 3), segmentStarttime = Math.max(isNaN(request.startTime) ? 0 : request.startTime, 0), eventStreams = [], inbandEvents;
        inbandEventFound = false;
        inbandEvents = adaptionSetInbandEvents.concat(representationInbandEvents);
        for (var loop = 0; loop < inbandEvents.length; loop++) {
            eventStreams[inbandEvents[loop].schemeIdUri] = inbandEvents[loop];
        }
        while (i < data.length) {
            identifier = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
            size = data[i] * expThree + data[i + 1] * expTwo + data[i + 2] * 256 + data[i + 3] * 1;
            if (identifier == "moov" || identifier == "moof") {
                break;
            } else if (identifier == "emsg") {
                inbandEventFound = true;
                var eventBox = [ "", "", 0, 0, 0, 0, "" ], arrIndex = 0, j = i + 12;
                while (j < size + i) {
                    if (arrIndex === 0 || arrIndex == 1 || arrIndex == 6) {
                        if (data[j] !== 0) {
                            eventBox[arrIndex] += String.fromCharCode(data[j]);
                        } else {
                            arrIndex += 1;
                        }
                        j += 1;
                    } else {
                        eventBox[arrIndex] = data[j] * expThree + data[j + 1] * expTwo + data[j + 2] * 256 + data[j + 3] * 1;
                        j += 4;
                        arrIndex += 1;
                    }
                }
                var schemeIdUri = eventBox[0], value = eventBox[1], timescale = eventBox[2], presentationTimeDelta = eventBox[3], duration = eventBox[4], id = eventBox[5], messageData = eventBox[6], presentationTime = segmentStarttime * timescale + presentationTimeDelta;
                if (eventStreams[schemeIdUri]) {
                    var event = new Dash.vo.Event();
                    event.eventStream = eventStreams[schemeIdUri];
                    event.eventStream.value = value;
                    event.eventStream.timescale = timescale;
                    event.duration = duration;
                    event.id = id;
                    event.presentationTime = presentationTime;
                    event.messageData = messageData;
                    event.presentationTimeDelta = presentationTimeDelta;
                    events.push(event);
                }
            }
            i += size;
        }
        return Q.when(events);
    }, deleteInbandEvents = function(data) {
        if (!inbandEventFound) {
            return Q.when(data);
        }
        var length = data.length, i = 0, j = 0, identifier, size, expTwo = Math.pow(256, 2), expThree = Math.pow(256, 3), modData = new Uint8Array(data.length);
        while (i < length) {
            identifier = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
            size = data[i] * expThree + data[i + 1] * expTwo + data[i + 2] * 256 + data[i + 3] * 1;
            if (identifier != "emsg") {
                for (var l = i; l < i + size; l++) {
                    modData[j] = data[l];
                    j += 1;
                }
            }
            i += size;
        }
        return Q.when(modData.subarray(0, j));
    }, checkGapBetweenBuffers = function() {
        var leastLevel = this.bufferExt.getLeastBufferLevel(), acceptableGap = fragmentDuration * 2, actualGap = bufferLevel - leastLevel;
        if (actualGap > acceptableGap && !deferredBuffersFlatten) {
            fragmentsToLoad = 0;
            deferredBuffersFlatten = Q.defer();
        } else if (actualGap < acceptableGap && deferredBuffersFlatten) {
            deferredBuffersFlatten.resolve();
            deferredBuffersFlatten = null;
        }
    }, hasEnoughSpaceToAppend = function() {
        var self = this, deferred = Q.defer(), removedTime = 0, startClearing;
        if (!isQuotaExceeded) {
            return Q.when(true);
        }
        startClearing = function() {
            clearBuffer.call(self).then(function(removedTimeValue) {
                removedTime += removedTimeValue;
                if (removedTime >= fragmentDuration) {
                    deferred.resolve();
                } else {
                    setTimeout(startClearing, fragmentDuration * 1e3);
                }
            });
        };
        startClearing.call(self);
        return deferred.promise;
    }, clearBuffer = function() {
        var self = this, deferred = Q.defer(), currentTime = self.videoModel.getCurrentTime(), removeStart = 0, removeEnd, req;
        req = self.fragmentController.getExecutedRequestForTime(fragmentModel, currentTime);
        removeEnd = req && !isNaN(req.startTime) ? req.startTime : Math.floor(currentTime);
        fragmentDuration = req && !isNaN(req.duration) ? req.duration : 1;
        self.sourceBufferExt.getBufferRange(buffer, currentTime).then(function(range) {
            if (range === null && seekTarget === currentTime && buffer.buffered.length > 0) {
                removeEnd = buffer.buffered.end(buffer.buffered.length - 1);
            }
            removeStart = buffer.buffered.start(0);
            self.sourceBufferExt.remove(buffer, removeStart, removeEnd, periodInfo.duration, mediaSource).then(function() {
                self.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, removeEnd);
                deferred.resolve(removeEnd - removeStart);
            });
        });
        return deferred.promise;
    }, onInitializationLoaded = function(request, response) {
        var self = this, initData = response.data, quality = request.quality;
        self.debug.log("Initialization finished loading: " + request.streamType);
        self.fragmentController.process(initData).then(function(data) {
            if (data !== null) {
                initializationData[quality] = data;
                if (quality === requiredQuality) {
                    appendToBuffer.call(self, data, request.quality).then(function() {
                        deferredInitAppend.resolve();
                    });
                }
            } else {
                self.debug.log("No " + type + " bytes to push.");
            }
        });
    }, onBytesError = function() {
        if (state === LOADING) {
            setState.call(this, READY);
        }
        this.system.notify("segmentLoadingFailed");
    }, searchForLiveEdge = function() {
        var self = this, availabilityRange = currentRepresentation.segmentAvailabilityRange, searchTimeSpan = 12 * 60 * 60;
        liveEdgeInitialSearchPosition = availabilityRange.end;
        liveEdgeSearchRange = {
            start: Math.max(0, liveEdgeInitialSearchPosition - searchTimeSpan),
            end: liveEdgeInitialSearchPosition + searchTimeSpan
        };
        liveEdgeSearchStep = Math.floor((availabilityRange.end - availabilityRange.start) / 2);
        deferredLiveEdge = Q.defer();
        if (currentRepresentation.useCalculatedLiveEdgeTime) {
            deferredLiveEdge.resolve(liveEdgeInitialSearchPosition);
        } else {
            self.indexHandler.getSegmentRequestForTime(currentRepresentation, liveEdgeInitialSearchPosition).then(findLiveEdge.bind(self, liveEdgeInitialSearchPosition, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
        }
        return deferredLiveEdge.promise;
    }, findLiveEdge = function(searchTime, onSuccess, onError, request) {
        var self = this;
        if (request === null) {
            currentRepresentation.segments = null;
            currentRepresentation.segmentAvailabilityRange = {
                start: searchTime - liveEdgeSearchStep,
                end: searchTime + liveEdgeSearchStep
            };
            self.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(self, searchTime, onSuccess, onError));
        } else {
            self.fragmentController.isFragmentExists(request).then(function(isExist) {
                if (isExist) {
                    onSuccess.call(self, request, searchTime);
                } else {
                    onError.call(self, request, searchTime);
                }
            });
        }
    }, onSearchForSegmentFailed = function(request, lastSearchTime) {
        var searchTime, searchInterval;
        if (useBinarySearch) {
            binarySearch.call(this, false, lastSearchTime);
            return;
        }
        searchInterval = lastSearchTime - liveEdgeInitialSearchPosition;
        searchTime = searchInterval > 0 ? liveEdgeInitialSearchPosition - searchInterval : liveEdgeInitialSearchPosition + Math.abs(searchInterval) + liveEdgeSearchStep;
        if (searchTime < liveEdgeSearchRange.start && searchTime > liveEdgeSearchRange.end) {
            this.system.notify("segmentLoadingFailed");
        } else {
            setState.call(this, READY);
            this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(this, searchTime, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
        }
    }, onSearchForSegmentSucceeded = function(request, lastSearchTime) {
        var startTime = request.startTime, self = this, searchTime;
        if (!useBinarySearch) {
            if (fragmentDuration === 0) {
                deferredLiveEdge.resolve(startTime);
                return;
            }
            useBinarySearch = true;
            liveEdgeSearchRange.end = startTime + 2 * liveEdgeSearchStep;
            if (lastSearchTime === liveEdgeInitialSearchPosition) {
                searchTime = lastSearchTime + fragmentDuration;
                this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(self, searchTime, function() {
                    binarySearch.call(self, true, searchTime);
                }, function() {
                    deferredLiveEdge.resolve(searchTime);
                }));
                return;
            }
        }
        binarySearch.call(this, true, lastSearchTime);
    }, binarySearch = function(lastSearchSucceeded, lastSearchTime) {
        var isSearchCompleted, searchTime;
        if (lastSearchSucceeded) {
            liveEdgeSearchRange.start = lastSearchTime;
        } else {
            liveEdgeSearchRange.end = lastSearchTime;
        }
        isSearchCompleted = Math.floor(liveEdgeSearchRange.end - liveEdgeSearchRange.start) <= fragmentDuration;
        if (isSearchCompleted) {
            deferredLiveEdge.resolve(lastSearchSucceeded ? lastSearchTime : lastSearchTime - fragmentDuration);
        } else {
            searchTime = (liveEdgeSearchRange.start + liveEdgeSearchRange.end) / 2;
            this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(this, searchTime, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
        }
    }, signalStreamComplete = function(request) {
        this.debug.log(type + " Stream is complete.");
        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
        doStop.call(this);
        deferredStreamComplete.resolve(request);
    }, loadInitialization = function() {
        var initializationPromise = null;
        if (initialPlayback) {
            this.debug.log("Marking a special seek for initial " + type + " playback.");
            if (!seeking) {
                seeking = true;
                seekTarget = 0;
            }
            initialPlayback = false;
        }
        if (dataChanged) {
            if (deferredInitAppend && Q.isPending(deferredInitAppend.promise)) {
                deferredInitAppend.resolve();
            }
            deferredInitAppend = Q.defer();
            initializationData = [];
            initializationPromise = this.indexHandler.getInitRequest(availableRepresentations[requiredQuality]);
        } else {
            initializationPromise = Q.when(null);
            if (currentQuality !== requiredQuality || currentQuality === -1) {
                if (deferredInitAppend && Q.isPending(deferredInitAppend.promise)) return Q.when(null);
                deferredInitAppend = Q.defer();
                if (initializationData[requiredQuality]) {
                    appendToBuffer.call(this, initializationData[requiredQuality], requiredQuality).then(function() {
                        deferredInitAppend.resolve();
                    });
                } else {
                    initializationPromise = this.indexHandler.getInitRequest(availableRepresentations[requiredQuality]);
                }
            }
        }
        return initializationPromise;
    }, loadNextFragment = function() {
        var promise, self = this;
        if (dataChanged && !seeking) {
            self.debug.log("Data changed - loading the " + type + " fragment for time: " + playingTime);
            promise = self.indexHandler.getSegmentRequestForTime(currentRepresentation, playingTime);
        } else {
            var deferred = Q.defer(), segmentTime;
            promise = deferred.promise;
            Q.when(seeking ? seekTarget : self.indexHandler.getCurrentTime(currentRepresentation)).then(function(time) {
                self.sourceBufferExt.getBufferRange(buffer, time).then(function(range) {
                    if (seeking) currentRepresentation.segments = null;
                    seeking = false;
                    segmentTime = range ? range.end : time;
                    self.indexHandler.getSegmentRequestForTime(currentRepresentation, segmentTime).then(function(request) {
                        deferred.resolve(request);
                    }, function() {
                        deferred.reject();
                    });
                }, function() {
                    deferred.reject();
                });
            }, function() {
                deferred.reject();
            });
        }
        return promise;
    }, onFragmentRequest = function(request) {
        var self = this;
        if (request !== null) {
            if (self.fragmentController.isFragmentLoadedOrPending(self, request)) {
                if (request.action !== "complete") {
                    self.indexHandler.getNextSegmentRequest(currentRepresentation).then(onFragmentRequest.bind(self));
                } else {
                    doStop.call(self);
                    setState.call(self, READY);
                }
            } else {
                Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : true).then(function() {
                    self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(function() {
                        setState.call(self, READY);
                    });
                });
            }
        } else {
            setState.call(self, READY);
        }
    }, checkIfSufficientBuffer = function() {
        if (waitingForBuffer) {
            var timeToEnd = getTimeToEnd.call(this);
            if (bufferLevel < minBufferTime && (minBufferTime < timeToEnd || minBufferTime >= timeToEnd && !isBufferingCompleted)) {
                if (!stalled) {
                    this.debug.log("Waiting for more " + type + " buffer before starting playback.");
                    stalled = true;
                    this.videoModel.stallStream(type, stalled);
                }
            } else {
                this.debug.log("Got enough " + type + " buffer to start.");
                waitingForBuffer = false;
                stalled = false;
                this.videoModel.stallStream(type, stalled);
            }
        }
    }, isSchedulingRequired = function() {
        var isPaused = this.videoModel.isPaused();
        return !isPaused || isPaused && this.scheduleWhilePaused;
    }, hasData = function() {
        return !!data && !!buffer;
    }, getTimeToEnd = function() {
        var currentTime = this.videoModel.getCurrentTime();
        return periodInfo.start + periodInfo.duration - currentTime;
    }, getWorkingTime = function() {
        var time = -1;
        time = this.videoModel.getCurrentTime();
        return time;
    }, getRequiredFragmentCount = function() {
        var self = this, playbackRate = self.videoModel.getPlaybackRate(), actualBufferedDuration = bufferLevel / Math.max(playbackRate, 1), deferred = Q.defer();
        self.bufferExt.getRequiredBufferLength(waitingForBuffer, self.requestScheduler.getExecuteInterval(self) / 1e3, isDynamic, periodInfo.duration).then(function(requiredBufferLength) {
            self.indexHandler.getSegmentCountForDuration(currentRepresentation, requiredBufferLength, actualBufferedDuration).then(function(count) {
                deferred.resolve(count);
            });
        });
        return deferred.promise;
    }, requestNewFragment = function() {
        var self = this, pendingRequests = self.fragmentController.getPendingRequests(self), loadingRequests = self.fragmentController.getLoadingRequests(self), ln = (pendingRequests ? pendingRequests.length : 0) + (loadingRequests ? loadingRequests.length : 0);
        if (fragmentsToLoad - ln > 0) {
            fragmentsToLoad--;
            loadNextFragment.call(self).then(onFragmentRequest.bind(self));
        } else {
            if (state === VALIDATING) {
                setState.call(self, READY);
            }
            finishValidation.call(self);
        }
    }, validate = function() {
        var self = this, newQuality, qualityChanged = false, now = new Date(), currentVideoTime = self.videoModel.getCurrentTime();
        checkIfSufficientBuffer.call(self);
        if (!isSchedulingRequired.call(self) && !initialPlayback && !dataChanged) {
            doStop.call(self);
            return;
        }
        if (bufferLevel < STALL_THRESHOLD && !stalled) {
            self.debug.log("Stalling " + type + " Buffer: " + type);
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON);
            stalled = true;
            waitingForBuffer = true;
            self.videoModel.stallStream(type, stalled);
        }
        if (state === READY) {
            setState.call(self, VALIDATING);
            var manifestMinBufferTime = self.manifestModel.getValue().minBufferTime;
            self.bufferExt.decideBufferLength(manifestMinBufferTime, periodInfo.duration, waitingForBuffer).then(function(time) {
                self.setMinBufferTime(time);
                self.requestScheduler.adjustExecuteInterval();
            });
            self.abrController.getPlaybackQuality(type, data).then(function(result) {
                var quality = result.quality;
                if (quality !== undefined) {
                    newQuality = quality;
                }
                qualityChanged = quality !== requiredQuality;
                if (qualityChanged === true) {
                    requiredQuality = newQuality;
                    self.fragmentController.cancelPendingRequestsForModel(fragmentModel);
                    currentRepresentation = getRepresentationForQuality.call(self, newQuality);
                    if (currentRepresentation === null || currentRepresentation === undefined) {
                        throw "Unexpected error!";
                    }
                    if (buffer.timestampOffset !== currentRepresentation.MSETimeOffset) {
                        buffer.timestampOffset = currentRepresentation.MSETimeOffset;
                    }
                    clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                    self.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, currentRepresentation.id);
                }
                return getRequiredFragmentCount.call(self, quality);
            }).then(function(count) {
                fragmentsToLoad = count;
                loadInitialization.call(self).then(function(request) {
                    if (request !== null) {
                        self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(function() {
                            setState.call(self, READY);
                        });
                        dataChanged = false;
                    }
                });
                requestNewFragment.call(self);
            });
        } else if (state === VALIDATING) {
            setState.call(self, READY);
        }
    };
    return {
        videoModel: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        indexHandler: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,
        scheduleWhilePaused: undefined,
        eventController: undefined,
        timelineConverter: undefined,
        initialize: function(type, periodInfo, data, buffer, videoModel, scheduler, fragmentController, source, eventController) {
            var self = this, manifest = self.manifestModel.getValue();
            isDynamic = self.manifestExt.getIsDynamic(manifest);
            self.setMediaSource(source);
            self.setVideoModel(videoModel);
            self.setType(type);
            self.setBuffer(buffer);
            self.setScheduler(scheduler);
            self.setFragmentController(fragmentController);
            self.setEventController(eventController);
            self.updateData(data, periodInfo).then(function() {
                if (!isDynamic) {
                    ready = true;
                    startPlayback.call(self);
                    return;
                }
                searchForLiveEdge.call(self).then(function(liveEdgeTime) {
                    var startTime = Math.max(liveEdgeTime - minBufferTime, currentRepresentation.segmentAvailabilityRange.start), metrics = self.metricsModel.getMetricsFor("stream"), manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics), duration, actualStartTime, segmentStart;
                    self.indexHandler.getSegmentRequestForTime(currentRepresentation, startTime).then(function(request) {
                        self.system.notify("liveEdgeFound", periodInfo.liveEdge, liveEdgeTime, periodInfo);
                        duration = request ? request.duration : fragmentDuration;
                        segmentStart = request ? request.startTime : currentRepresentation.adaptation.period.end - fragmentDuration;
                        actualStartTime = segmentStart + duration / 2;
                        periodInfo.liveEdge = actualStartTime;
                        self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                            currentTime: actualStartTime,
                            presentationStartTime: liveEdgeTime,
                            latency: liveEdgeTime - actualStartTime,
                            clientTimeOffset: currentRepresentation.adaptation.period.mpd.clientServerTimeShift
                        });
                        ready = true;
                        startPlayback.call(self);
                        doSeek.call(self, segmentStart);
                    });
                });
            });
            self.indexHandler.setIsDynamic(isDynamic);
            self.bufferExt.decideBufferLength(manifest.minBufferTime, periodInfo, waitingForBuffer).then(function(time) {
                self.setMinBufferTime(time);
            });
        },
        getType: function() {
            return type;
        },
        setType: function(value) {
            type = value;
            if (this.indexHandler !== undefined) {
                this.indexHandler.setType(value);
            }
        },
        getPeriodInfo: function() {
            return periodInfo;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        getScheduler: function() {
            return this.requestScheduler;
        },
        setScheduler: function(value) {
            this.requestScheduler = value;
        },
        getFragmentController: function() {
            return this.fragmentController;
        },
        setFragmentController: function(value) {
            this.fragmentController = value;
        },
        setEventController: function(value) {
            this.eventController = value;
        },
        getAutoSwitchBitrate: function() {
            var self = this;
            return self.abrController.getAutoSwitchBitrate();
        },
        setAutoSwitchBitrate: function(value) {
            var self = this;
            self.abrController.setAutoSwitchBitrate(value);
        },
        getData: function() {
            return data;
        },
        updateData: function(dataValue, periodInfoValue) {
            var self = this, deferred = Q.defer(), metrics = self.metricsModel.getMetricsFor("stream"), manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics), from = data, quality, ln, r;
            if (!from) {
                from = dataValue;
            }
            doStop.call(self);
            updateRepresentations.call(self, dataValue, periodInfoValue).then(function(representations) {
                availableRepresentations = representations;
                periodInfo = periodInfoValue;
                ln = representations.length;
                for (var i = 0; i < ln; i += 1) {
                    r = representations[i];
                    self.metricsModel.addManifestUpdateRepresentationInfo(manifestUpdateInfo, r.id, r.index, r.adaptation.period.index, type, r.presentationTimeOffset, r.startNumber, r.segmentInfoType);
                }
                quality = self.abrController.getQualityFor(type);
                if (!currentRepresentation) {
                    currentRepresentation = getRepresentationForQuality.call(self, quality);
                }
                self.indexHandler.getCurrentTime(currentRepresentation).then(function(time) {
                    dataChanged = true;
                    playingTime = time;
                    requiredQuality = quality;
                    currentRepresentation = getRepresentationForQuality.call(self, quality);
                    buffer.timestampOffset = currentRepresentation.MSETimeOffset;
                    if (currentRepresentation.segmentDuration) {
                        fragmentDuration = currentRepresentation.segmentDuration;
                    }
                    data = dataValue;
                    self.bufferExt.updateData(data, type);
                    self.seek(time);
                    self.indexHandler.updateSegmentList(currentRepresentation).then(function() {
                        self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                            latency: currentRepresentation.segmentAvailabilityRange.end - self.videoModel.getCurrentTime()
                        });
                        deferred.resolve();
                    });
                });
            });
            return deferred.promise;
        },
        getCurrentRepresentation: function() {
            return currentRepresentation;
        },
        getBuffer: function() {
            return buffer;
        },
        setBuffer: function(value) {
            buffer = value;
        },
        getMinBufferTime: function() {
            return minBufferTime;
        },
        setMinBufferTime: function(value) {
            minBufferTime = value;
        },
        setMediaSource: function(value) {
            mediaSource = value;
        },
        isReady: function() {
            return state === READY;
        },
        isBufferingCompleted: function() {
            return isBufferingCompleted;
        },
        clearMetrics: function() {
            var self = this;
            if (type === null || type === "") {
                return;
            }
            self.metricsModel.clearCurrentMetricsForType(type);
        },
        updateBufferState: function() {
            var self = this;
            if (isQuotaExceeded && rejectedBytes && !appendingRejectedData) {
                appendingRejectedData = true;
                appendToBuffer.call(self, rejectedBytes.data, rejectedBytes.quality, rejectedBytes.index).then(function() {
                    appendingRejectedData = false;
                });
            } else {
                updateBufferLevel.call(self);
            }
        },
        updateStalledState: function() {
            stalled = this.videoModel.isStalled();
            checkIfSufficientBuffer.call(this);
        },
        reset: function(errored) {
            var self = this, cancel = function cancelDeferred(d) {
                if (d) {
                    d.reject();
                    d = null;
                }
            };
            doStop.call(self);
            cancel(deferredLiveEdge);
            cancel(deferredInitAppend);
            cancel(deferredRejectedDataAppend);
            cancel(deferredBuffersFlatten);
            deferredAppends.forEach(cancel);
            deferredAppends = [];
            cancel(deferredStreamComplete);
            deferredStreamComplete = Q.defer();
            self.clearMetrics();
            self.fragmentController.abortRequestsForModel(fragmentModel);
            self.fragmentController.detachBufferController(fragmentModel);
            fragmentModel = null;
            initializationData = [];
            initialPlayback = true;
            liveEdgeSearchRange = null;
            liveEdgeInitialSearchPosition = null;
            useBinarySearch = false;
            liveEdgeSearchStep = null;
            isQuotaExceeded = false;
            rejectedBytes = null;
            appendingRejectedData = false;
            if (!errored) {
                self.sourceBufferExt.abort(mediaSource, buffer);
                self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }
            data = null;
            buffer = null;
        },
        start: doStart,
        seek: doSeek,
        stop: doStop
    };
};

MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};

MediaPlayer.dependencies.BufferExtensions = function() {
    "use strict";
    var minBufferTarget, currentBufferTarget, topAudioQualityIndex = 0, topVideoQualityIndex = 0, audioData = null, videoData = null, getCurrentHttpRequestLatency = function(metrics) {
        var httpRequest = this.metricsExt.getCurrentHttpRequest(metrics);
        if (httpRequest !== null) {
            return (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) / 1e3;
        }
        return 0;
    }, isPlayingAtTopQuality = function() {
        var self = this, audioQuality, videoQuality, isAtTop;
        audioQuality = audioData ? self.abrController.getQualityFor("audio") : topAudioQualityIndex;
        videoQuality = videoData ? self.abrController.getQualityFor("video") : topVideoQualityIndex;
        isAtTop = audioQuality === topAudioQualityIndex && videoQuality === topVideoQualityIndex;
        return isAtTop;
    };
    return {
        system: undefined,
        videoModel: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        metricsModel: undefined,
        abrController: undefined,
        bufferMax: undefined,
        updateData: function(data, type) {
            var topIndex = data.Representation_asArray.length - 1;
            if (type === "audio") {
                topAudioQualityIndex = topIndex;
                audioData = data;
            } else if (type === "video") {
                topVideoQualityIndex = topIndex;
                videoData = data;
            }
        },
        getTopQualityIndex: function(type) {
            var topQualityIndex = null;
            if (type === "audio") {
                topQualityIndex = topAudioQualityIndex;
            } else if (type === "video") {
                topQualityIndex = topVideoQualityIndex;
            }
            return topQualityIndex;
        },
        decideBufferLength: function(minBufferTime, duration) {
            if (isNaN(duration) || MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME < duration && minBufferTime < duration) {
                minBufferTarget = Math.max(MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME, minBufferTime);
            } else if (minBufferTime >= duration) {
                minBufferTarget = Math.min(duration, MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME);
            } else {
                minBufferTarget = Math.min(duration, minBufferTime);
            }
            return Q.when(minBufferTarget);
        },
        getLeastBufferLevel: function() {
            var videoMetrics = this.metricsModel.getReadOnlyMetricsFor("video"), videoBufferLevel = this.metricsExt.getCurrentBufferLevel(videoMetrics), audioMetrics = this.metricsModel.getReadOnlyMetricsFor("audio"), audioBufferLevel = this.metricsExt.getCurrentBufferLevel(audioMetrics), leastLevel = null;
            if (videoBufferLevel === null || audioBufferLevel === null) {
                leastLevel = audioBufferLevel !== null ? audioBufferLevel.level : videoBufferLevel !== null ? videoBufferLevel.level : null;
            } else {
                leastLevel = Math.min(audioBufferLevel.level, videoBufferLevel.level);
            }
            return leastLevel;
        },
        getRequiredBufferLength: function(waitingForBuffer, delay, isDynamic, duration) {
            var self = this, vmetrics = self.metricsModel.getReadOnlyMetricsFor("video"), ametrics = self.metricsModel.getReadOnlyMetricsFor("audio"), isLongFormContent = duration >= MediaPlayer.dependencies.BufferExtensions.LONG_FORM_CONTENT_DURATION_THRESHOLD, deferred = Q.defer(), isAtTop = false, requiredBufferLength;
            if (self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_MIN) {
                requiredBufferLength = minBufferTarget;
                deferred.resolve(requiredBufferLength);
            } else if (self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_INFINITY) {
                requiredBufferLength = duration;
                deferred.resolve(requiredBufferLength);
            } else if (self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED) {
                currentBufferTarget = minBufferTarget;
                if (!isDynamic) {
                    if (!waitingForBuffer) {
                        isAtTop = isPlayingAtTopQuality.call(self);
                    }
                }
                if (isAtTop) {
                    currentBufferTarget = isLongFormContent ? MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM : MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY;
                }
                requiredBufferLength = currentBufferTarget + delay + Math.max(getCurrentHttpRequestLatency.call(self, vmetrics), getCurrentHttpRequestLatency.call(self, ametrics));
                deferred.resolve(requiredBufferLength);
            } else {
                deferred.reject("invalid bufferMax value: " + self.bufferMax);
            }
            return deferred.promise;
        },
        getBufferTarget: function() {
            return currentBufferTarget === undefined ? minBufferTarget : currentBufferTarget;
        }
    };
};

MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED = "required";

MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_MIN = "min";

MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_INFINITY = "infinity";

MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_STARTUP = 1;

MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME = 16;

MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY = 30;

MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 300;

MediaPlayer.dependencies.BufferExtensions.LONG_FORM_CONTENT_DURATION_THRESHOLD = 600;

MediaPlayer.dependencies.BufferExtensions.prototype.constructor = MediaPlayer.dependencies.BufferExtensions;

MediaPlayer.utils.Capabilities = function() {
    "use strict";
};

MediaPlayer.utils.Capabilities.prototype = {
    constructor: MediaPlayer.utils.Capabilities,
    supportsMediaSource: function() {
        "use strict";
        var hasWebKit = "WebKitMediaSource" in window, hasMediaSource = "MediaSource" in window;
        return hasWebKit || hasMediaSource;
    },
    supportsMediaKeys: function() {
        "use strict";
        var hasWebKit = "WebKitMediaKeys" in window, hasMs = "MSMediaKeys" in window, hasMediaSource = "MediaKeys" in window;
        return hasWebKit || hasMs || hasMediaSource;
    },
    supportsCodec: function(element, codec) {
        "use strict";
        if (!(element instanceof HTMLMediaElement)) {
            throw "element must be of type HTMLMediaElement.";
        }
        var canPlay = element.canPlayType(codec);
        return canPlay === "probably";
    }
};

MediaPlayer.utils.Config = function() {
    "use strict";
    var paramsType = [ "video", "audio" ], params = {
        "BufferController.minBufferTimeForPlaying": -1,
        "BufferController.minBufferTime": -1,
        "ABR.minBandwidth": -1,
        "ABR.maxBandwidth": -1,
        "ABR.minQuality": -1,
        "ABR.maxQuality": -1,
        "ABR.switchUpIncrementally": false,
        "ABR.switchUpRatioSafetyFactor": -1,
        "ABR.latencyInBandwidth": true,
        "ABR.switchDownBufferTime": -1,
        "ABR.switchDownBufferRatio": -1,
        video: {},
        audio: {}
    }, doSetParams = function(newParams) {
        var item, typeParams, typeItem;
        for (item in newParams) {
            if (item.indexOf("//") === -1) {
                if (paramsType.indexOf(item) > -1) {
                    typeParams = newParams[item];
                    for (typeItem in typeParams) {
                        params[item][typeItem] = newParams[item][typeItem];
                    }
                } else {
                    params[item] = newParams[item];
                }
            }
        }
    }, getParam = function(params, name, type, def) {
        var value = params[name];
        if (value === undefined || value === -1) {
            return def;
        }
        if (type !== undefined && typeof value !== type) {
            switch (type) {
              case "number":
                value = Number(value);
                break;

              case "boolean":
                value = value === "true" || value === "1" || value === 1;
                break;

              default:
                break;
            }
        }
        return value;
    }, doGetParam = function(name, type, def) {
        return getParam(params, name, type, def);
    }, doGetParamFor = function(key, name, type, def) {
        var typeParams = params[key];
        if (typeParams !== undefined && typeParams[name] !== undefined) {
            return getParam(typeParams, name, type, def);
        }
        return getParam(params, name, type, def);
    };
    return {
        debug: undefined,
        setup: function() {},
        setParams: function(newParams) {
            doSetParams(newParams);
        },
        getParam: function(name, type, def) {
            return doGetParam(name, type, def);
        },
        getParamFor: function(key, name, type, def) {
            return doGetParamFor(key, name, type, def);
        }
    };
};

MediaPlayer.utils.Config.prototype = {
    constructor: MediaPlayer.utils.Config
};

MediaPlayer.utils.Debug = function() {
    "use strict";
    var logToBrowserConsole = true, level = 4;
    return {
        eventBus: undefined,
        NONE: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4,
        ALL: 4,
        setLevel: function(value) {
            level = value;
        },
        getLevel: function() {
            return level;
        },
        setLogToBrowserConsole: function(value) {
            logToBrowserConsole = value;
        },
        getLogToBrowserConsole: function() {
            return logToBrowserConsole;
        },
        log: function(message) {
            if (logToBrowserConsole) {
                console.log(message);
            }
            this.eventBus.dispatchEvent({
                type: "log",
                message: message
            });
        }
    };
};

MediaPlayer.dependencies.ErrorHandler = function() {
    "use strict";
    return {
        eventBus: undefined,
        capabilityError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "capability",
                event: err
            });
        },
        downloadError: function(id, url, request) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "download",
                event: {
                    id: id,
                    url: url,
                    request: request
                }
            });
        },
        manifestError: function(message, id, manifest) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "manifestError",
                event: {
                    message: message,
                    id: id,
                    manifest: manifest
                }
            });
        },
        closedCaptionsError: function(message, id, ccContent) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "cc",
                event: {
                    message: message,
                    id: id,
                    cc: ccContent
                }
            });
        },
        mediaSourceError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "mediasource",
                event: err
            });
        },
        mediaKeySessionError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "key_session",
                event: err
            });
        },
        mediaKeyMessageError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "key_message",
                event: err
            });
        },
        mediaKeySystemSelectionError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "key_system_selection",
                event: err
            });
        }
    };
};

MediaPlayer.dependencies.ErrorHandler.prototype = {
    constructor: MediaPlayer.dependencies.ErrorHandler
};

MediaPlayer.utils.EventBus = function() {
    "use strict";
    var registrations, getListeners = function(type, useCapture) {
        var captype = (useCapture ? "1" : "0") + type;
        if (!(captype in registrations)) {
            registrations[captype] = [];
        }
        return registrations[captype];
    }, init = function() {
        registrations = {};
    };
    init();
    return {
        addEventListener: function(type, listener, useCapture) {
            var listeners = getListeners(type, useCapture);
            var idx = listeners.indexOf(listener);
            if (idx === -1) {
                listeners.push(listener);
            }
        },
        removeEventListener: function(type, listener, useCapture) {
            var listeners = getListeners(type, useCapture);
            var idx = listeners.indexOf(listener);
            if (idx !== -1) {
                listeners.splice(idx, 1);
            }
        },
        dispatchEvent: function(evt) {
            var listeners = getListeners(evt.type, false).slice();
            for (var i = 0; i < listeners.length; i++) {
                listeners[i].call(this, evt);
            }
            return !evt.defaultPrevented;
        }
    };
};

MediaPlayer.dependencies.EventController = function() {
    "use strict";
    var inlineEvents = [], inbandEvents = [], activeEvents = [], eventInterval = null, refreshDelay = 100, presentationTimeThreshold = refreshDelay / 1e3, MPD_RELOAD_SCHEME = "urn:mpeg:dash:event:2012", MPD_RELOAD_VALUE = 1, reset = function() {
        if (eventInterval !== null) {
            clearInterval(eventInterval);
            eventInterval = null;
        }
        inlineEvents = null;
        inbandEvents = null;
        activeEvents = null;
    }, clear = function() {
        if (eventInterval !== null) {
            clearInterval(eventInterval);
            eventInterval = null;
        }
    }, start = function() {
        var self = this;
        self.debug.log("[EventController] Start Event Controller");
        if (!isNaN(refreshDelay)) {
            eventInterval = setInterval(onEventTimer.bind(this), refreshDelay);
        }
    }, addInlineEvents = function(values) {
        var self = this;
        inlineEvents = [];
        if (values && values.length > 0) {
            inlineEvents = values;
        }
        self.debug.log("[EventController] Added " + values.length + " inline events");
    }, addInbandEvents = function(values) {
        var self = this;
        for (var i = 0; i < values.length; i++) {
            var event = values[i];
            inbandEvents[event.id] = event;
            self.debug.log("[EventController] Add inband event with id " + event.id);
        }
    }, onEventTimer = function() {
        triggerEvents.call(this, inbandEvents);
        triggerEvents.call(this, inlineEvents);
        removeEvents.call(this);
    }, triggerEvents = function(events) {
        var self = this, currentVideoTime = this.videoModel.getCurrentTime(), presentationTime;
        if (events) {
            for (var j = 0; j < events.length; j++) {
                var curr = events[j];
                if (curr !== undefined) {
                    presentationTime = curr.presentationTime / curr.eventStream.timescale;
                    if (presentationTime === 0 || presentationTime <= currentVideoTime && presentationTime + presentationTimeThreshold > currentVideoTime) {
                        self.debug.log("[EventController] Start Event at " + currentVideoTime);
                        if (curr.duration > 0) activeEvents.push(curr);
                        if (curr.eventStream.schemeIdUri == MPD_RELOAD_SCHEME && curr.eventStream.value == MPD_RELOAD_VALUE) refreshManifest.call(this);
                        events.splice(j, 1);
                    }
                }
            }
        }
    }, removeEvents = function() {
        var self = this;
        if (activeEvents) {
            var currentVideoTime = this.videoModel.getCurrentTime();
            for (var i = 0; i < activeEvents.length; i++) {
                var curr = activeEvents[i];
                if (curr !== null && (curr.duration + curr.presentationTime) / curr.eventStream.timescale < currentVideoTime) {
                    self.debug.log("[EventController] Remove Event at time " + currentVideoTime);
                    curr = null;
                    activeEvents.splice(i, 1);
                }
            }
        }
    }, refreshManifest = function() {
        var self = this, manifest = self.manifestModel.getValue(), url = manifest.mpdUrl;
        if (manifest.hasOwnProperty("Location")) {
            url = manifest.Location;
        }
        self.debug.log("[EventController] Refresh manifest @ " + url);
        self.manifestLoader.load(url).then(function(manifestResult) {
            self.manifestModel.setValue(manifestResult);
        });
    };
    return {
        manifestModel: undefined,
        manifestExt: undefined,
        manifestLoader: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,
        videoModel: undefined,
        addInlineEvents: addInlineEvents,
        addInbandEvents: addInbandEvents,
        reset: reset,
        clear: clear,
        start: start,
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        initialize: function(videoModel) {
            this.setVideoModel(videoModel);
        }
    };
};

MediaPlayer.dependencies.EventController.prototype = {
    constructor: MediaPlayer.dependencies.EventController
};

MediaPlayer.dependencies.FragmentController = function() {
    "use strict";
    var fragmentModels = [], findModel = function(bufferController) {
        var ln = fragmentModels.length;
        for (var i = 0; i < ln; i++) {
            if (fragmentModels[i].getContext() == bufferController) {
                return fragmentModels[i];
            }
        }
        return null;
    }, isReadyToLoadNextFragment = function() {
        var isReady = true, ln = fragmentModels.length;
        for (var i = 0; i < ln; i++) {
            if (!fragmentModels[i].isReady()) {
                isReady = false;
                break;
            }
        }
        return isReady;
    }, executeRequests = function() {
        for (var i = 0; i < fragmentModels.length; i++) {
            fragmentModels[i].executeCurrentRequest();
        }
    };
    return {
        system: undefined,
        debug: undefined,
        fragmentLoader: undefined,
        process: function(bytes) {
            var result = null;
            if (bytes !== null && bytes !== undefined && bytes.byteLength > 0) {
                result = new Uint8Array(bytes);
            }
            return Q.when(result);
        },
        attachBufferController: function(bufferController) {
            if (!bufferController) return null;
            var model = findModel(bufferController);
            if (!model) {
                model = this.system.getObject("fragmentModel");
                model.setContext(bufferController);
                fragmentModels.push(model);
            }
            return model;
        },
        detachBufferController: function(bufferController) {
            var idx = fragmentModels.indexOf(bufferController);
            if (idx > -1) {
                fragmentModels.splice(idx, 1);
            }
        },
        onBufferControllerStateChange: function() {
            if (isReadyToLoadNextFragment()) {
                executeRequests.call(this);
            }
        },
        isFragmentLoadedOrPending: function(bufferController, request) {
            var fragmentModel = findModel(bufferController), isLoaded;
            if (!fragmentModel) {
                return false;
            }
            isLoaded = fragmentModel.isFragmentLoadedOrPending(request);
            return isLoaded;
        },
        getPendingRequests: function(bufferController) {
            var fragmentModel = findModel(bufferController);
            if (!fragmentModel) {
                return null;
            }
            return fragmentModel.getPendingRequests();
        },
        getLoadingRequests: function(bufferController) {
            var fragmentModel = findModel(bufferController);
            if (!fragmentModel) {
                return null;
            }
            return fragmentModel.getLoadingRequests();
        },
        isInitializationRequest: function(request) {
            return request && request.type && request.type.toLowerCase() === "initialization segment";
        },
        getLoadingTime: function(bufferController) {
            var fragmentModel = findModel(bufferController);
            if (!fragmentModel) {
                return null;
            }
            return fragmentModel.getLoadingTime();
        },
        getExecutedRequestForTime: function(model, time) {
            if (model) {
                return model.getExecutedRequestForTime(time);
            }
            return null;
        },
        removeExecutedRequest: function(model, request) {
            if (model) {
                model.removeExecutedRequest(request);
            }
        },
        removeExecutedRequestsBeforeTime: function(model, time) {
            if (model) {
                model.removeExecutedRequestsBeforeTime(time);
            }
        },
        cancelPendingRequestsForModel: function(model) {
            if (model) {
                model.cancelPendingRequests();
            }
        },
        abortRequestsForModel: function(model) {
            if (model) {
                model.abortRequests();
            }
        },
        isFragmentExists: function(request) {
            var deferred = Q.defer();
            this.fragmentLoader.checkForExistence(request).then(function() {
                deferred.resolve(true);
            }, function() {
                deferred.resolve(false);
            });
            return deferred.promise;
        },
        prepareFragmentForLoading: function(bufferController, request, startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback) {
            var fragmentModel = findModel(bufferController);
            if (!fragmentModel || !request) {
                return Q.when(null);
            }
            fragmentModel.addRequest(request);
            fragmentModel.setCallbacks(startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback);
            return Q.when(true);
        }
    };
};

MediaPlayer.dependencies.FragmentController.prototype = {
    constructor: MediaPlayer.dependencies.FragmentController
};

MediaPlayer.dependencies.FragmentLoader = function() {
    "use strict";
    var RETRY_ATTEMPTS = 3, RETRY_INTERVAL = 500, xhrs = [], doLoad = function(request, remainingAttempts) {
        var req = new XMLHttpRequest(), httpRequestMetrics = null, firstProgress = true, needFailureReport = true, lastTraceTime = null, self = this;
        xhrs.push(req);
        request.requestStartDate = new Date();
        httpRequestMetrics = self.metricsModel.addHttpRequest(request.streamType, null, request.type, request.url, null, request.range, request.requestStartDate, null, null, null, null, request.duration, request.startTime, request.quality);
        self.metricsModel.appendHttpTrace(httpRequestMetrics, request.requestStartDate, request.requestStartDate.getTime() - request.requestStartDate.getTime(), [ 0 ]);
        lastTraceTime = request.requestStartDate;
        req.open("GET", self.tokenAuthentication.addTokenAsQueryArg(request.url), true);
        req.responseType = "arraybuffer";
        req = self.tokenAuthentication.setTokenInRequestHeader(req);
        if (request.range) {
            req.setRequestHeader("Range", "bytes=" + request.range);
        }
        req.onprogress = function(event) {
            var currentTime = new Date();
            if (firstProgress) {
                firstProgress = false;
                if (!event.lengthComputable || event.lengthComputable && event.total != event.loaded) {
                    request.firstByteDate = currentTime;
                    httpRequestMetrics.tresponse = currentTime;
                }
            }
            self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ req.response ? req.response.byteLength : 0 ]);
            lastTraceTime = currentTime;
        };
        req.onload = function() {
            if (req.status < 200 || req.status > 299) {
                return;
            }
            needFailureReport = false;
            var currentTime = new Date(), bytes = req.response, latency, download;
            if (!request.firstByteDate) {
                request.firstByteDate = request.requestStartDate;
            }
            request.requestEndDate = currentTime;
            latency = request.firstByteDate.getTime() - request.requestStartDate.getTime();
            download = request.requestEndDate.getTime() - request.firstByteDate.getTime();
            self.debug.log("[FragmentLoader][" + request.streamType + "] Loaded: " + request.url + " (" + req.status + ", " + latency + "ms, " + download + "ms)");
            httpRequestMetrics.tresponse = request.firstByteDate;
            httpRequestMetrics.tfinish = request.requestEndDate;
            httpRequestMetrics.responsecode = req.status;
            httpRequestMetrics.bytesLength = bytes ? bytes.byteLength : 0;
            self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ bytes ? bytes.byteLength : 0 ]);
            lastTraceTime = currentTime;
            request.deferred.resolve({
                data: bytes,
                request: request
            });
        };
        req.onloadend = req.onerror = function() {
            if (xhrs.indexOf(req) === -1) {
                return;
            } else {
                xhrs.splice(xhrs.indexOf(req), 1);
            }
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;
            var currentTime = new Date(), bytes = req.response, latency, download;
            if (!request.firstByteDate) {
                request.firstByteDate = request.requestStartDate;
            }
            request.requestEndDate = currentTime;
            latency = request.firstByteDate.getTime() - request.requestStartDate.getTime();
            download = request.requestEndDate.getTime() - request.firstByteDate.getTime();
            httpRequestMetrics.tresponse = request.firstByteDate;
            httpRequestMetrics.tfinish = request.requestEndDate;
            httpRequestMetrics.responsecode = req.status;
            self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ bytes ? bytes.byteLength : 0 ]);
            lastTraceTime = currentTime;
            if (remainingAttempts > 0) {
                self.debug.log("[FragmentLoader][" + request.streamType + "] Failed loading: " + request.type + ":" + request.startTime + ", retry in " + RETRY_INTERVAL + "ms" + " attempts: " + remainingAttempts);
                remainingAttempts--;
                setTimeout(function() {
                    doLoad.call(self, request, remainingAttempts);
                }, RETRY_INTERVAL);
            } else {
                self.debug.log("[FragmentLoader][" + request.streamType + "] Failed loading: " + request.type + ":" + request.startTime + " no retry attempts left");
                self.errHandler.downloadError("content", request.url, req);
                request.deferred.reject(req);
            }
        };
        self.debug.log("[FragmentLoader][" + request.streamType + "] Load: " + request.url);
        req.send();
    }, checkForExistence = function(request) {
        var req = new XMLHttpRequest(), isSuccessful = false;
        req.open("HEAD", request.url, true);
        req.onload = function() {
            if (req.status < 200 || req.status > 299) return;
            isSuccessful = true;
            request.deferred.resolve(request);
        };
        req.onloadend = req.onerror = function() {
            if (isSuccessful) return;
            request.deferred.reject(req);
        };
        req.send();
    };
    return {
        metricsModel: undefined,
        errHandler: undefined,
        debug: undefined,
        tokenAuthentication: undefined,
        load: function(req) {
            if (!req) {
                return Q.when(null);
            }
            req.deferred = Q.defer();
            doLoad.call(this, req, RETRY_ATTEMPTS);
            return req.deferred.promise;
        },
        checkForExistence: function(req) {
            if (!req) {
                return Q.when(null);
            }
            req.deferred = Q.defer();
            checkForExistence.call(this, req);
            return req.deferred.promise;
        },
        abort: function() {
            var i, req, ln = xhrs.length;
            for (i = 0; i < ln; i += 1) {
                this.debug.log("[FragmentLoader][" + xhrs[i].streamType + "] ### Abort XHR ", xhrs[i].url);
                req = xhrs[i];
                xhrs[i] = null;
                req.abort();
                req = null;
            }
            xhrs = [];
        }
    };
};

MediaPlayer.dependencies.FragmentLoader.prototype = {
    constructor: MediaPlayer.dependencies.FragmentLoader
};

MediaPlayer.dependencies.FragmentModel = function() {
    "use strict";
    var context, executedRequests = [], pendingRequests = [], loadingRequests = [], startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback, LOADING_REQUEST_THRESHOLD = 2, loadCurrentFragment = function(request) {
        var onSuccess, onError, self = this;
        startLoadingCallback.call(context, request);
        onSuccess = function(request, response) {
            loadingRequests.splice(loadingRequests.indexOf(request), 1);
            executedRequests.push(request);
            successLoadingCallback.call(context, request, response);
            request.deferred = null;
        };
        onError = function(request) {
            loadingRequests.splice(loadingRequests.indexOf(request), 1);
            errorLoadingCallback.call(context, request);
            request.deferred = null;
        };
        self.fragmentLoader.load(request).then(onSuccess.bind(context, request), onError.bind(context, request));
    }, sortRequestsByProperty = function(requestsArray, sortProp) {
        var compare = function(req1, req2) {
            if (req1[sortProp] < req2[sortProp]) return -1;
            if (req1[sortProp] > req2[sortProp]) return 1;
            return 0;
        };
        requestsArray.sort(compare);
    }, removeExecutedRequest = function(request) {
        var idx = executedRequests.indexOf(request);
        if (idx !== -1) {
            executedRequests.splice(idx, 1);
        }
    };
    return {
        system: undefined,
        debug: undefined,
        fragmentLoader: undefined,
        setContext: function(value) {
            context = value;
        },
        getContext: function() {
            return context;
        },
        addRequest: function(value) {
            if (value) {
                if (this.isFragmentLoadedOrPending(value)) return;
                pendingRequests.push(value);
                sortRequestsByProperty.call(this, pendingRequests, "index");
            }
        },
        setCallbacks: function(onLoadingStart, onLoadingSuccess, onLoadingError, onStreamEnd) {
            startLoadingCallback = onLoadingStart;
            streamEndCallback = onStreamEnd;
            errorLoadingCallback = onLoadingError;
            successLoadingCallback = onLoadingSuccess;
        },
        isFragmentLoadedOrPending: function(request) {
            var isLoaded = false, ln = executedRequests.length, req;
            for (var i = 0; i < ln; i++) {
                req = executedRequests[i];
                if (request.startTime === req.startTime || req.action === "complete" && request.action === req.action) {
                    if (request.url === req.url) {
                        isLoaded = true;
                        break;
                    } else {
                        removeExecutedRequest(request);
                    }
                }
            }
            if (!isLoaded) {
                for (i = 0, ln = pendingRequests.length; i < ln; i += 1) {
                    req = pendingRequests[i];
                    if (request.url === req.url && request.startTime === req.startTime) {
                        isLoaded = true;
                    }
                }
            }
            if (!isLoaded) {
                for (i = 0, ln = loadingRequests.length; i < ln; i += 1) {
                    req = loadingRequests[i];
                    if (request.url === req.url && request.startTime === req.startTime) {
                        isLoaded = true;
                    }
                }
            }
            return isLoaded;
        },
        isReady: function() {
            return context.isReady();
        },
        getPendingRequests: function() {
            return pendingRequests;
        },
        getLoadingRequests: function() {
            return loadingRequests;
        },
        getLoadingTime: function() {
            var loadingTime = 0, req, i;
            for (i = executedRequests.length - 1; i >= 0; i -= 1) {
                req = executedRequests[i];
                if (req.requestEndDate instanceof Date && req.firstByteDate instanceof Date) {
                    loadingTime = req.requestEndDate.getTime() - req.firstByteDate.getTime();
                    break;
                }
            }
            return loadingTime;
        },
        getExecutedRequestForTime: function(time) {
            var lastIdx = executedRequests.length - 1, start = NaN, end = NaN, req = null, i;
            for (i = lastIdx; i >= 0; i -= 1) {
                req = executedRequests[i];
                start = req.startTime;
                end = start + req.duration;
                if (!isNaN(start) && !isNaN(end) && time > start && time < end) {
                    return req;
                }
            }
            return null;
        },
        getExecutedRequestForQualityAndIndex: function(quality, index) {
            var lastIdx = executedRequests.length - 1, req = null, i;
            for (i = lastIdx; i >= 0; i -= 1) {
                req = executedRequests[i];
                if (req.quality === quality && req.index === index) {
                    return req;
                }
            }
            return null;
        },
        removeExecutedRequest: function(request) {
            removeExecutedRequest.call(this, request);
        },
        removeExecutedRequestsBeforeTime: function(time) {
            var lastIdx = executedRequests.length - 1, start = NaN, req = null, i;
            for (i = lastIdx; i >= 0; i -= 1) {
                req = executedRequests[i];
                start = req.startTime;
                if (!isNaN(start) && start < time) {
                    removeExecutedRequest.call(this, req);
                }
            }
        },
        cancelPendingRequests: function() {
            pendingRequests = [];
        },
        abortRequests: function() {
            this.fragmentLoader.abort();
            loadingRequests = [];
        },
        executeCurrentRequest: function() {
            var self = this, currentRequest;
            if (pendingRequests.length === 0) return;
            if (loadingRequests.length >= LOADING_REQUEST_THRESHOLD) {
                return;
            }
            currentRequest = pendingRequests.shift();
            switch (currentRequest.action) {
              case "complete":
                executedRequests.push(currentRequest);
                streamEndCallback.call(context, currentRequest);
                break;

              case "download":
                loadingRequests.push(currentRequest);
                loadCurrentFragment.call(self, currentRequest);
                break;

              default:
                this.debug.log("Unknown request action.");
                if (currentRequest.deferred) {
                    currentRequest.deferred.reject();
                    currentRequest.deferred = null;
                } else {
                    errorLoadingCallback.call(context, currentRequest);
                }
            }
        }
    };
};

MediaPlayer.dependencies.FragmentModel.prototype = {
    constructor: MediaPlayer.dependencies.FragmentModel
};

MediaPlayer.dependencies.ManifestLoader = function() {
    "use strict";
    var RETRY_ATTEMPTS = 3, RETRY_INTERVAL = 500, deferred = null, parseBaseUrl = function(url) {
        var base = null;
        if (url.indexOf("/") !== -1) {
            if (url.indexOf("?") !== -1) {
                url = url.substring(0, url.indexOf("?"));
            }
            base = url.substring(0, url.lastIndexOf("/") + 1);
        }
        return base;
    }, doLoad = function(url, remainingAttempts) {
        var baseUrl = parseBaseUrl(url), request = new XMLHttpRequest(), requestTime = new Date(), mpdLoadedTime = null, needFailureReport = true, onload = null, report = null, self = this;
        onload = function() {
            if (request.status < 200 || request.status > 299) {
                return;
            }
            self.debug.log("[ManifestLoader] Manifest downloaded");
            if (request.responseURL) {
                self.debug.log("[ManifestLoader] Redirect URL: " + request.responseURL);
                baseUrl = parseBaseUrl(request.responseURL);
            }
            needFailureReport = false;
            mpdLoadedTime = new Date();
            self.tokenAuthentication.checkRequestHeaderForToken(request);
            self.metricsModel.addHttpRequest("stream", null, "MPD", url, null, null, requestTime, mpdLoadedTime, request.status, null, null);
            self.parser.parse(request.responseText, baseUrl).then(function(manifest) {
                manifest.mpdUrl = url;
                manifest.mpdLoadedTime = mpdLoadedTime;
                self.metricsModel.addManifestUpdate("stream", manifest.type, requestTime, mpdLoadedTime, manifest.availabilityStartTime);
                deferred.resolve(manifest);
            }, function() {
                deferred.reject(request);
            });
        };
        report = function() {
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;
            self.metricsModel.addHttpRequest("stream", null, "MPD", url, null, null, requestTime, new Date(), request.status, null, null);
            if (remainingAttempts > 0) {
                self.debug.log("Failed loading manifest: " + url + ", retry in " + RETRY_INTERVAL + "ms" + " attempts: " + remainingAttempts);
                remainingAttempts--;
                setTimeout(function() {
                    doLoad.call(self, url, remainingAttempts);
                }, RETRY_INTERVAL);
            } else {
                self.debug.log("Failed loading manifest: " + url + " no retry attempts left");
                self.errHandler.downloadError("manifest", url, request);
                deferred.reject(request);
            }
        };
        try {
            request.onload = onload;
            request.onloadend = report;
            request.onerror = report;
            request.open("GET", url, true);
            request.send();
        } catch (e) {
            request.onerror();
        }
    };
    return {
        debug: undefined,
        parser: undefined,
        errHandler: undefined,
        metricsModel: undefined,
        tokenAuthentication: undefined,
        load: function(url) {
            deferred = Q.defer();
            doLoad.call(this, url, RETRY_ATTEMPTS);
            return deferred.promise;
        }
    };
};

MediaPlayer.dependencies.ManifestLoader.prototype = {
    constructor: MediaPlayer.dependencies.ManifestLoader
};

MediaPlayer.models.ManifestModel = function() {
    "use strict";
    var manifest;
    return {
        system: undefined,
        eventBus: undefined,
        getValue: function() {
            return manifest;
        },
        setValue: function(value) {
            manifest = value;
            this.system.notify("manifestUpdated");
            if (manifest !== null) {
                this.eventBus.dispatchEvent({
                    type: "manifestLoaded",
                    data: value
                });
            }
        }
    };
};

MediaPlayer.models.ManifestModel.prototype = {
    constructor: MediaPlayer.models.ManifestModel
};

MediaPlayer.dependencies.ManifestUpdater = function() {
    "use strict";
    var refreshDelay = NaN, refreshTimer = null, isStopped = false, deferredUpdate, clear = function() {
        if (refreshTimer !== null) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }, start = function() {
        clear.call(this);
        if (!isNaN(refreshDelay)) {
            this.debug.log("Refresh manifest in " + refreshDelay + " seconds.");
            refreshTimer = setTimeout(onRefreshTimer.bind(this), Math.min(refreshDelay * 1e3, Math.pow(2, 31) - 1), this);
        }
    }, update = function() {
        var self = this, manifest = self.manifestModel.getValue(), timeSinceLastUpdate;
        if (manifest !== undefined && manifest !== null) {
            self.manifestExt.getRefreshDelay(manifest).then(function(t) {
                timeSinceLastUpdate = (new Date().getTime() - manifest.mpdLoadedTime.getTime()) / 1e3;
                refreshDelay = Math.max(t - timeSinceLastUpdate, 0);
                start.call(self);
            });
        }
    }, onRefreshTimer = function() {
        var self = this, manifest, url;
        Q.when(deferredUpdate ? deferredUpdate.promise : true).then(function() {
            deferredUpdate = Q.defer();
            manifest = self.manifestModel.getValue();
            url = manifest.mpdUrl;
            if (manifest.hasOwnProperty("Location")) {
                url = manifest.Location;
            }
            self.manifestLoader.load(url).then(function(manifestResult) {
                self.manifestModel.setValue(manifestResult);
                self.debug.log("Manifest has been refreshed.");
                if (isStopped) return;
                update.call(self);
            });
        });
    }, onStreamsComposed = function() {
        if (deferredUpdate) {
            deferredUpdate.resolve();
        }
    };
    return {
        debug: undefined,
        system: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        manifestLoader: undefined,
        setup: function() {
            update.call(this);
            this.system.mapHandler("streamsComposed", undefined, onStreamsComposed.bind(this));
        },
        start: function() {
            isStopped = false;
            update.call(this);
        },
        stop: function() {
            isStopped = true;
            clear.call(this);
        }
    };
};

MediaPlayer.dependencies.ManifestUpdater.prototype = {
    constructor: MediaPlayer.dependencies.ManifestUpdater
};

MediaPlayer.dependencies.MediaSourceExtensions = function() {
    "use strict";
};

MediaPlayer.dependencies.MediaSourceExtensions.prototype = {
    constructor: MediaPlayer.dependencies.MediaSourceExtensions,
    createMediaSource: function() {
        "use strict";
        var hasWebKit = "WebKitMediaSource" in window, hasMediaSource = "MediaSource" in window;
        if (hasMediaSource) {
            return Q.when(new MediaSource());
        } else if (hasWebKit) {
            return Q.when(new WebKitMediaSource());
        }
        return null;
    },
    attachMediaSource: function(source, videoModel) {
        "use strict";
        videoModel.setSource(window.URL.createObjectURL(source));
        return Q.when(true);
    },
    detachMediaSource: function(videoModel) {
        "use strict";
        videoModel.setSource("");
        return Q.when(true);
    },
    setDuration: function(source, value) {
        "use strict";
        source.duration = value;
        return Q.when(source.duration);
    },
    signalEndOfStream: function(source) {
        "use strict";
        source.endOfStream();
        return Q.when(true);
    }
};

MediaPlayer.models.MetricsModel = function() {
    "use strict";
    return {
        system: undefined,
        eventBus: undefined,
        streamMetrics: {},
        metricsChanged: function() {
            this.eventBus.dispatchEvent({
                type: "metricsChanged",
                data: {}
            });
        },
        metricChanged: function(streamType) {
            this.eventBus.dispatchEvent({
                type: "metricChanged",
                data: {
                    stream: streamType
                }
            });
            this.metricsChanged();
        },
        metricUpdated: function(streamType, metricType, vo) {
            this.eventBus.dispatchEvent({
                type: "metricUpdated",
                data: {
                    stream: streamType,
                    metric: metricType,
                    value: vo
                }
            });
            this.metricChanged(streamType);
        },
        metricAdded: function(streamType, metricType, vo) {
            this.eventBus.dispatchEvent({
                type: "metricAdded",
                data: {
                    stream: streamType,
                    metric: metricType,
                    value: vo
                }
            });
            this.metricChanged(streamType);
        },
        clearCurrentMetricsForType: function(type) {
            delete this.streamMetrics[type];
            this.metricChanged(type);
        },
        clearAllCurrentMetrics: function() {
            var self = this;
            this.streamMetrics = {};
            this.metricsChanged.call(self);
        },
        getReadOnlyMetricsFor: function(type) {
            if (this.streamMetrics.hasOwnProperty(type)) {
                return this.streamMetrics[type];
            }
            return null;
        },
        getMetricsFor: function(type) {
            var metrics;
            if (this.streamMetrics.hasOwnProperty(type)) {
                metrics = this.streamMetrics[type];
            } else {
                metrics = this.system.getObject("metrics");
                this.streamMetrics[type] = metrics;
            }
            return metrics;
        },
        addTcpConnection: function(streamType, tcpid, dest, topen, tclose, tconnect) {
            var vo = new MediaPlayer.vo.metrics.TCPConnection();
            vo.tcpid = tcpid;
            vo.dest = dest;
            vo.topen = topen;
            vo.tclose = tclose;
            vo.tconnect = tconnect;
            this.getMetricsFor(streamType).TcpList.push(vo);
            this.metricAdded(streamType, "TcpConnection", vo);
            return vo;
        },
        addHttpRequest: function(streamType, tcpid, type, url, actualurl, range, trequest, tresponse, tfinish, responsecode, interval, mediaduration, startTime, quality) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest();
            vo.stream = streamType;
            vo.tcpid = tcpid;
            vo.type = type;
            vo.url = url;
            vo.actualurl = actualurl;
            vo.range = range;
            vo.trequest = trequest;
            vo.tresponse = tresponse;
            vo.tfinish = tfinish;
            vo.responsecode = responsecode;
            vo.interval = interval;
            vo.mediaduration = mediaduration;
            vo.startTime = startTime;
            vo.quality = quality;
            this.getMetricsFor(streamType).HttpList.push(vo);
            if (this.getMetricsFor(streamType).HttpList.length > 10) {
                this.getMetricsFor(streamType).HttpList.shift();
            }
            this.metricAdded(streamType, "HttpRequest", vo);
            return vo;
        },
        appendHttpTrace: function(httpRequest, s, d, b) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest.Trace();
            vo.s = s;
            vo.d = d;
            vo.b = b;
            httpRequest.trace.push(vo);
            this.metricUpdated(httpRequest.stream, "HttpRequestTrace", httpRequest);
            return vo;
        },
        addRepresentationSwitch: function(streamType, t, mt, to, lto) {
            var vo = new MediaPlayer.vo.metrics.RepresentationSwitch();
            vo.t = t;
            vo.mt = mt;
            vo.to = to;
            vo.lto = lto;
            this.getMetricsFor(streamType).RepSwitchList.push(vo);
            this.metricAdded(streamType, "RepresentationSwitch", vo);
            return vo;
        },
        addBufferLevel: function(streamType, t, level) {
            var vo = new MediaPlayer.vo.metrics.BufferLevel();
            vo.t = t;
            vo.level = level;
            this.getMetricsFor(streamType).BufferLevel.push(vo);
            if (this.getMetricsFor(streamType).BufferLevel.length > 10) {
                this.getMetricsFor(streamType).BufferLevel.shift();
            }
            this.metricAdded(streamType, "BufferLevel", vo);
            return vo;
        },
        addDVRInfo: function(streamType, currentTime, mpd, range) {
            var vo = new MediaPlayer.vo.metrics.DVRInfo();
            vo.time = currentTime;
            vo.range = range;
            vo.mpd = mpd;
            this.getMetricsFor(streamType).DVRInfo.push(vo);
            this.metricAdded(streamType, "DVRInfo", vo);
            return vo;
        },
        addDroppedFrames: function(streamType, quality) {
            var vo = new MediaPlayer.vo.metrics.DroppedFrames(), list = this.getMetricsFor(streamType).DroppedFrames;
            vo.time = quality.creationTime;
            vo.droppedFrames = quality.droppedVideoFrames;
            vo.decodedFrameCount = quality.totalVideoFrames;
            if (list.length > 0 && list[list.length - 1] == vo) {
                return list[list.length - 1];
            }
            list.push(vo);
            this.metricAdded(streamType, "DroppedFrames", vo);
            return vo;
        },
        addManifestUpdate: function(streamType, type, requestTime, fetchTime, availabilityStartTime, presentationStartTime, clientTimeOffset, currentTime, buffered, latency) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate(), metrics = this.getMetricsFor("stream");
            vo.streamType = streamType;
            vo.type = type;
            vo.requestTime = requestTime;
            vo.fetchTime = fetchTime;
            vo.availabilityStartTime = availabilityStartTime;
            vo.presentationStartTime = presentationStartTime;
            vo.clientTimeOffset = clientTimeOffset;
            vo.currentTime = currentTime;
            vo.buffered = buffered;
            vo.latency = latency;
            metrics.ManifestUpdate.push(vo);
            this.metricAdded(streamType, "ManifestUpdate", vo);
            return vo;
        },
        updateManifestUpdateInfo: function(manifestUpdate, updatedFields) {
            for (var field in updatedFields) {
                manifestUpdate[field] = updatedFields[field];
            }
            this.metricUpdated(manifestUpdate.streamType, "ManifestUpdate", manifestUpdate);
        },
        addManifestUpdatePeriodInfo: function(manifestUpdate, id, index, start, duration) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo();
            vo.id = id;
            vo.index = index;
            vo.start = start;
            vo.duration = duration;
            manifestUpdate.periodInfo.push(vo);
            this.metricUpdated(manifestUpdate.streamType, "ManifestUpdatePeriodInfo", manifestUpdate);
            return vo;
        },
        addManifestUpdateRepresentationInfo: function(manifestUpdate, id, index, periodIndex, streamType, presentationTimeOffset, startNumber, segmentInfoType) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo();
            vo.id = id;
            vo.index = index;
            vo.periodIndex = periodIndex;
            vo.streamType = streamType;
            vo.startNumber = startNumber;
            vo.segmentInfoType = segmentInfoType;
            vo.presentationTimeOffset = presentationTimeOffset;
            manifestUpdate.representationInfo.push(vo);
            this.metricUpdated(manifestUpdate.streamType, "ManifestUpdateRepresentationInfo", manifestUpdate);
            return vo;
        },
        addPlayList: function(streamType, start, mstart, starttype) {
            var vo = new MediaPlayer.vo.metrics.PlayList();
            vo.stream = streamType;
            vo.start = start;
            vo.mstart = mstart;
            vo.starttype = starttype;
            this.getMetricsFor(streamType).PlayList.push(vo);
            if (this.getMetricsFor(streamType).PlayList.length > 10) {
                this.getMetricsFor(streamType).PlayList.shift();
            }
            this.metricAdded(streamType, "PlayList", vo);
            return vo;
        },
        appendPlayListTrace: function(playList, representationid, subreplevel, start, mstart, duration, playbackspeed, stopreason) {
            var vo = new MediaPlayer.vo.metrics.PlayList.Trace();
            vo.representationid = representationid;
            vo.subreplevel = subreplevel;
            vo.start = start;
            vo.mstart = mstart;
            vo.duration = duration;
            vo.playbackspeed = playbackspeed;
            vo.stopreason = stopreason;
            playList.trace.push(vo);
            if (playList.trace.length > 10) {
                playList.trace.shift();
            }
            this.metricUpdated(playList.stream, "PlayListTrace", playList);
            return vo;
        }
    };
};

MediaPlayer.models.MetricsModel.prototype = {
    constructor: MediaPlayer.models.MetricsModel
};

MediaPlayer.dependencies.Mp4Processor = function() {
    "use strict";
    var createMovieHeaderBox = function(tracks) {
        var mvhd = new mp4lib.boxes.MovieHeaderBox(), track = tracks[tracks.length - 1];
        mvhd.version = 1;
        mvhd.creation_time = 0;
        mvhd.modification_time = 0;
        mvhd.timescale = track.timescale;
        mvhd.duration = Math.round(track.duration * track.timescale);
        mvhd.rate = 65536;
        mvhd.volume = 256;
        mvhd.reserved = 0;
        mvhd.reserved_2 = [ 0, 0 ];
        mvhd.matrix = [ 65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824 ];
        mvhd.pre_defined = [ 0, 0, 0, 0, 0, 0 ];
        mvhd.next_track_ID = track.trackId + 1;
        mvhd.flags = 0;
        return mvhd;
    }, createTrackBox = function(track) {
        var trak, tkhd, mdia;
        trak = new mp4lib.boxes.TrackBox();
        tkhd = new mp4lib.boxes.TrackHeaderBox();
        tkhd.version = 1;
        tkhd.flags = 1 | 2 | 4;
        tkhd.creation_time = 0;
        tkhd.modification_time = 0;
        tkhd.track_id = track.trackId;
        tkhd.reserved = 0;
        tkhd.duration = Math.round(track.duration * track.timescale);
        tkhd.reserved_2 = [ 0, 0 ];
        tkhd.layer = 0;
        tkhd.alternate_group = 0;
        tkhd.volume = 256;
        tkhd.reserved_3 = 0;
        tkhd.matrix = [ 65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824 ];
        tkhd.width = track.width << 16;
        tkhd.height = track.height << 16;
        trak.boxes.push(tkhd);
        mdia = new mp4lib.boxes.MediaBox();
        mdia.boxes.push(createMediaHeaderBox(track));
        mdia.boxes.push(createHandlerReferenceBox(track));
        mdia.boxes.push(createMediaInformationBox(track));
        trak.boxes.push(mdia);
        return trak;
    }, getLanguageCode = function(language) {
        var firstLetterCode, secondLetterCode, thirdLetterCode, result = 0;
        firstLetterCode = language.charCodeAt(0) - 96 << 10;
        secondLetterCode = language.charCodeAt(1) - 96 << 5;
        thirdLetterCode = language.charCodeAt(2) - 96;
        result = firstLetterCode | secondLetterCode | thirdLetterCode;
        return result;
    }, createMediaHeaderBox = function(track) {
        var mdhd = new mp4lib.boxes.MediaHeaderBox();
        mdhd.flags = 0;
        mdhd.version = 1;
        mdhd.creation_time = 0;
        mdhd.modification_time = 0;
        mdhd.timescale = track.timescale;
        mdhd.duration = Math.round(track.duration * track.timescale);
        mdhd.pad = 0;
        mdhd.language = getLanguageCode(track.language);
        mdhd.pre_defined = 0;
        return mdhd;
    }, stringToCharCode = function(str) {
        var code = 0, i;
        for (i = 0; i < str.length; i++) {
            code |= str.charCodeAt(i) << (str.length - i - 1) * 8;
        }
        return code;
    }, createHandlerReferenceBox = function(track) {
        var hdlr = new mp4lib.boxes.HandlerBox();
        hdlr.version = 0;
        hdlr.pre_defined = 0;
        switch (track.type) {
          case "video":
            hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPEVIDEO);
            hdlr.name = hdlr.HANDLERVIDEONAME;
            break;

          case "audio":
            hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPEAUDIO);
            hdlr.name = hdlr.HANDLERAUDIONAME;
            break;

          default:
            hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPETEXT);
            hdlr.name = hdlr.HANDLERTEXTNAME;
            break;
        }
        hdlr.name += "\x00";
        hdlr.reserved = [ 0, 0, 0 ];
        hdlr.flags = 0;
        return hdlr;
    }, createMediaInformationBox = function(track) {
        var minf = new mp4lib.boxes.MediaInformationBox();
        switch (track.type) {
          case "video":
            minf.boxes.push(createVideoMediaHeaderBox(track));
            break;

          case "audio":
            minf.boxes.push(createSoundMediaHeaderBox(track));
            break;

          default:
            break;
        }
        minf.boxes.push(createDataInformationBox(track));
        minf.boxes.push(createSampleTableBox(track));
        return minf;
    }, createDataInformationBox = function() {
        var dinf, dref, url;
        dinf = new mp4lib.boxes.DataInformationBox();
        dref = new mp4lib.boxes.DataReferenceBox();
        dref.version = 0;
        dref.entry_count = 1;
        dref.flags = 0;
        url = new mp4lib.boxes.DataEntryUrlBox();
        url.location = "";
        url.version = 0;
        url.flags = 1;
        dref.boxes.push(url);
        dinf.boxes.push(dref);
        return dinf;
    }, createDecodingTimeToSampleBox = function() {
        var stts = new mp4lib.boxes.TimeToSampleBox();
        stts.version = 0;
        stts.entry_count = 0;
        stts.flags = 0;
        stts.entry = [];
        return stts;
    }, createSampleToChunkBox = function() {
        var stsc = new mp4lib.boxes.SampleToChunkBox();
        stsc.flags = 0;
        stsc.version = 0;
        stsc.entry_count = 0;
        stsc.entry = [];
        return stsc;
    }, createChunkOffsetBox = function() {
        var stco = new mp4lib.boxes.ChunkOffsetBox();
        stco.version = 0;
        stco.entry_count = 0;
        stco.flags = 0;
        stco.chunk_offset = [];
        return stco;
    }, createSampleSizeBox = function() {
        var stsz = new mp4lib.boxes.SampleSizeBox();
        stsz.version = 0;
        stsz.flags = 0;
        stsz.sample_count = 0;
        stsz.sample_size = 0;
        return stsz;
    }, _hexstringtoBuffer = function(a) {
        var res = new Uint8Array(a.length / 2), i;
        for (i = 0; i < a.length / 2; i++) {
            res[i] = parseInt("" + a[i * 2] + a[i * 2 + 1], 16);
        }
        return res;
    }, _mergeArrays = function(oldBuffer, newPart) {
        var res = new Uint8Array(oldBuffer.length + newPart.length);
        res.set(oldBuffer, 0);
        res.set(newPart, oldBuffer.length);
        return res;
    }, createAVCConfigurationBox = function(track) {
        var avcC, NALDatabuffer, codecPrivateData, NALArray, SPS_index, PPS_index, i, NALBuffer, tempBuffer, regexpSPS = new RegExp("^[A-Z0-9]7", "gi"), regexpPPS = new RegExp("^[A-Z0-9]8", "gi");
        avcC = new mp4lib.boxes.AVCConfigurationBox();
        avcC.configurationVersion = 1;
        avcC.lengthSizeMinusOne = 3;
        avcC.reserved = 63;
        avcC.SPS_NAL = [];
        avcC.PPS_NAL = [];
        NALDatabuffer = new Uint8Array(0);
        codecPrivateData = track.codecPrivateData;
        NALArray = codecPrivateData.split("00000001");
        NALArray.splice(0, 1);
        SPS_index = 0;
        PPS_index = 0;
        for (i = 0; i < NALArray.length; i++) {
            NALBuffer = _hexstringtoBuffer(NALArray[i]);
            if (NALArray[i].match(regexpSPS)) {
                avcC.SPS_NAL[SPS_index++] = {
                    NAL_length: NALBuffer.length,
                    NAL: NALBuffer
                };
                avcC.AVCProfileIndication = parseInt(NALArray[i].substr(2, 2), 16);
                avcC.profile_compatibility = parseInt(NALArray[i].substr(4, 2), 16);
                avcC.AVCLevelIndication = parseInt(NALArray[i].substr(6, 2), 16);
            }
            if (NALArray[i].match(regexpPPS)) {
                avcC.PPS_NAL[PPS_index++] = {
                    NAL_length: NALBuffer.length,
                    NAL: NALBuffer
                };
            }
            tempBuffer = new Uint8Array(NALBuffer.length + 4);
            tempBuffer[3] = NALBuffer.length;
            tempBuffer.set(NALBuffer, 4);
            NALDatabuffer = _mergeArrays(NALDatabuffer, tempBuffer);
        }
        avcC.numOfSequenceParameterSets = SPS_index;
        avcC.numOfPictureParameterSets = PPS_index;
        return avcC;
    }, createAVCVisualSampleEntry = function(track) {
        var avc1 = null;
        if (track.contentProtection !== undefined) {
            avc1 = new mp4lib.boxes.EncryptedVideoBox();
        } else {
            avc1 = new mp4lib.boxes.AVC1VisualSampleEntryBox();
        }
        avc1.data_reference_index = 1;
        avc1.compressorname = "AVC Coding";
        avc1.depth = 24;
        avc1.reserved = [ 0, 0, 0, 0, 0, 0 ];
        avc1.reserved_2 = 0;
        avc1.reserved_3 = 0;
        avc1.pre_defined = 0;
        avc1.pre_defined_2 = [ 0, 0, 0 ];
        avc1.pre_defined_3 = 65535;
        avc1.frame_count = 1;
        avc1.horizresolution = 4718592;
        avc1.vertresolution = 4718592;
        avc1.height = track.height;
        avc1.width = track.width;
        avc1.boxes.push(createAVCConfigurationBox(track));
        if (track.contentProtection !== undefined) {
            avc1.boxes.push(createProtectionSchemeInfoBox(track));
        }
        return avc1;
    }, createOriginalFormatBox = function(track) {
        var frma = new mp4lib.boxes.OriginalFormatBox();
        frma.data_format = stringToCharCode(track.codecs.substring(0, track.codecs.indexOf(".")));
        return frma;
    }, createSchemeTypeBox = function() {
        var schm = new mp4lib.boxes.SchemeTypeBox();
        schm.flags = 0;
        schm.version = 0;
        schm.scheme_type = 1667591779;
        schm.scheme_version = 65536;
        return schm;
    }, createSchemeInformationBox = function(track) {
        var schi = new mp4lib.boxes.SchemeInformationBox();
        schi.boxes.push(createTrackEncryptionBox(track));
        return schi;
    }, createTrackEncryptionBox = function() {
        var tenc = new mp4lib.boxes.TrackEncryptionBox();
        tenc.flags = 0;
        tenc.version = 0;
        tenc.default_IsEncrypted = 1;
        tenc.default_IV_size = 8;
        tenc.default_KID = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
        return tenc;
    }, createProtectionSchemeInfoBox = function(track) {
        var sinf = new mp4lib.boxes.ProtectionSchemeInformationBox();
        sinf.boxes.push(createOriginalFormatBox(track));
        sinf.boxes.push(createSchemeTypeBox());
        sinf.boxes.push(createSchemeInformationBox(track));
        return sinf;
    }, createVisualSampleEntry = function(track) {
        var codec = track.codecs.substring(0, track.codecs.indexOf("."));
        switch (codec) {
          case "avc1":
            return createAVCVisualSampleEntry(track);

          default:
            break;
        }
    }, parseHexString = function(str) {
        var bytes = [];
        while (str.length >= 2) {
            bytes.push(parseInt(str.substring(0, 2), 16));
            str = str.substring(2, str.length);
        }
        return bytes;
    }, createMPEG4AACESDescriptor = function(track) {
        var audioSpecificConfig, dsiLength, decoderSpecificInfo, dcdLength, decoderConfigDescriptor, esdLength, esDescriptor;
        audioSpecificConfig = parseHexString(track.codecPrivateData);
        dsiLength = audioSpecificConfig.length;
        decoderSpecificInfo = new Uint8Array(2 + dsiLength);
        decoderSpecificInfo[0] = 5;
        decoderSpecificInfo[1] = dsiLength;
        decoderSpecificInfo.set(audioSpecificConfig, 2);
        dcdLength = 13 + decoderSpecificInfo.length;
        decoderConfigDescriptor = new Uint8Array(2 + dcdLength);
        decoderConfigDescriptor[0] = 4;
        decoderConfigDescriptor[1] = dcdLength;
        decoderConfigDescriptor[2] = 64;
        decoderConfigDescriptor[3] = 5 << 2;
        decoderConfigDescriptor[3] |= 0 << 1;
        decoderConfigDescriptor[3] |= 1;
        decoderConfigDescriptor[4] = 255;
        decoderConfigDescriptor[5] = 255;
        decoderConfigDescriptor[6] = 255;
        decoderConfigDescriptor[7] = (track.bandwidth & 4278190080) >> 24;
        decoderConfigDescriptor[8] = (track.bandwidth & 16711680) >> 16;
        decoderConfigDescriptor[9] = (track.bandwidth & 65280) >> 8;
        decoderConfigDescriptor[10] = track.bandwidth & 255;
        decoderConfigDescriptor[11] = (track.bandwidth & 4278190080) >> 24;
        decoderConfigDescriptor[12] |= (track.bandwidth & 16711680) >> 16;
        decoderConfigDescriptor[13] |= (track.bandwidth & 65280) >> 8;
        decoderConfigDescriptor[14] |= track.bandwidth & 255;
        decoderConfigDescriptor.set(decoderSpecificInfo, 15);
        esdLength = 3 + decoderConfigDescriptor.length;
        esDescriptor = new Uint8Array(2 + esdLength);
        esDescriptor[0] = 3;
        esDescriptor[1] = esdLength;
        esDescriptor[2] = (track.trackId & 65280) >> 8;
        esDescriptor[3] = track.trackId & 255;
        esDescriptor[4] = 0;
        esDescriptor.set(decoderConfigDescriptor, 5);
        return esDescriptor;
    }, createMP4AudioSampleEntry = function(track) {
        var mp4a = null, esdBox, ES_Descriptor;
        if (track.contentProtection !== undefined) {
            mp4a = new mp4lib.boxes.EncryptedAudioBox();
        } else {
            mp4a = new mp4lib.boxes.MP4AudioSampleEntryBox();
        }
        mp4a.reserved = [ 0, 0, 0, 0, 0, 0 ];
        mp4a.data_reference_index = 1;
        mp4a.reserved_2 = [ 0, 0 ];
        mp4a.channelcount = track.channels;
        mp4a.samplesize = 16;
        mp4a.pre_defined = 0;
        mp4a.reserved_3 = 0;
        mp4a.samplerate = track.samplingRate << 16;
        esdBox = new mp4lib.boxes.ESDBox();
        ES_Descriptor = createMPEG4AACESDescriptor(track);
        esdBox.ES_tag = ES_Descriptor[0];
        esdBox.ES_length = ES_Descriptor[1];
        esdBox.ES_data = ES_Descriptor.subarray(2, ES_Descriptor.length);
        esdBox.version = 0;
        esdBox.flags = 0;
        mp4a.boxes.push(esdBox);
        if (track.contentProtection !== undefined) {
            mp4a.boxes.push(createProtectionSchemeInfoBox(track));
        }
        return mp4a;
    }, createAudioSampleEntry = function(track) {
        var codec = track.codecs.substring(0, track.codecs.indexOf("."));
        switch (codec) {
          case "mp4a":
            return createMP4AudioSampleEntry(track);

          default:
            break;
        }
        return null;
    }, createSampleDescriptionBox = function(track) {
        var stsd = new mp4lib.boxes.SampleDescriptionBox();
        stsd.version = 0;
        stsd.flags = 0;
        switch (track.type) {
          case "video":
            stsd.boxes.push(createVisualSampleEntry(track));
            break;

          case "audio":
            stsd.boxes.push(createAudioSampleEntry(track));
            break;

          default:
            break;
        }
        return stsd;
    }, createSampleTableBox = function(track) {
        var stbl = new mp4lib.boxes.SampleTableBox();
        stbl.boxes.push(createDecodingTimeToSampleBox(track));
        stbl.boxes.push(createSampleToChunkBox(track));
        stbl.boxes.push(createChunkOffsetBox(track));
        stbl.boxes.push(createSampleSizeBox(track));
        stbl.boxes.push(createSampleDescriptionBox(track));
        return stbl;
    }, createVideoMediaHeaderBox = function() {
        var vmhd = new mp4lib.boxes.VideoMediaHeaderBox();
        vmhd.version = 0;
        vmhd.flags = 1;
        vmhd.graphicsmode = 0;
        vmhd.opcolor = [ 0, 0, 0 ];
        return vmhd;
    }, createSoundMediaHeaderBox = function() {
        var smhd = new mp4lib.boxes.SoundMediaHeaderBox();
        smhd.version = 0;
        smhd.balance = 0;
        smhd.reserved = 0;
        smhd.flags = 1;
        return smhd;
    }, createFileTypeBox = function() {
        var ftyp = new mp4lib.boxes.FileTypeBox();
        ftyp.major_brand = 1769172790;
        ftyp.minor_brand = 1;
        ftyp.compatible_brands = [];
        ftyp.compatible_brands[0] = 1769172845;
        ftyp.compatible_brands[1] = 1769172790;
        ftyp.compatible_brands[2] = 1836278888;
        return ftyp;
    }, createMovieExtendsBox = function(tracks) {
        var mvex, trex, track = tracks[tracks.length - 1], i;
        mvex = new mp4lib.boxes.MovieExtendsBox();
        for (i = 0; i < tracks.length; i++) {
            track = tracks[i];
            trex = new mp4lib.boxes.TrackExtendsBox();
            trex.version = 0;
            trex.flags = 0;
            trex.track_ID = track.trackId;
            trex.default_sample_description_index = 1;
            trex.default_sample_duration = 0;
            trex.default_sample_flags = 0;
            trex.default_sample_size = 0;
            mvex.boxes.push(trex);
        }
        return mvex;
    }, createProtectionSystemSpecificHeaderBox = function(track) {
        var pssh, schemeIdUri, array;
        pssh = new mp4lib.boxes.ProtectionSystemSpecificHeaderBox();
        pssh.version = 0;
        pssh.flags = 0;
        schemeIdUri = track.contentProtection.schemeIdUri.substring(8).replace(/[^A-Fa-f0-9]/g, "");
        pssh.SystemID = _hexstringtoBuffer(schemeIdUri);
        array = BASE64.decodeArray(track.contentProtection.pro.__text);
        pssh.DataSize = array.length;
        pssh.Data = array;
        return pssh;
    }, doGenerateInitSegment = function(tracks) {
        var moov_file, moov, i;
        moov_file = new mp4lib.boxes.File();
        moov = new mp4lib.boxes.MovieBox();
        moov.boxes.push(createMovieHeaderBox(tracks));
        for (i = 0; i < tracks.length; i++) {
            moov.boxes.push(createTrackBox(tracks[i]));
        }
        moov.boxes.push(createMovieExtendsBox(tracks));
        for (i = 0; i < tracks.length; i++) {
            if (tracks[i].contentProtection !== undefined) {
                moov.boxes.push(createProtectionSystemSpecificHeaderBox(tracks[i]));
            }
        }
        moov_file.boxes.push(createFileTypeBox());
        moov_file.boxes.push(moov);
        return mp4lib.serialize(moov_file);
    }, createMovieFragmentHeaderBox = function(sequenceNumber) {
        var mfhd = new mp4lib.boxes.MovieFragmentHeaderBox();
        mfhd.version = 0;
        mfhd.flags = 0;
        mfhd.sequence_number = sequenceNumber;
        return mfhd;
    }, createTrackFragmentBox = function(track) {
        var traf = new mp4lib.boxes.TrackFragmentBox();
        traf.version = 0;
        traf.flags = 0;
        traf.boxes.push(createTrackFragmentHeaderBox(track));
        traf.boxes.push(createTrackFragmentBaseMediaDecodeTimeBox(track));
        traf.boxes.push(createTrackFragmentRunBox(track));
        return traf;
    }, createTrackFragmentHeaderBox = function(track) {
        var tfhd = new mp4lib.boxes.TrackFragmentHeaderBox();
        tfhd.version = 0;
        tfhd.flags = 131072;
        tfhd.track_ID = track.trackId;
        return tfhd;
    }, createTrackFragmentBaseMediaDecodeTimeBox = function(track) {
        var tfdt = new mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox();
        tfdt.version = 1;
        tfdt.flags = 0;
        tfdt.baseMediaDecodeTime = track.samples.length > 0 ? track.samples[0].dts : 0;
        return tfdt;
    }, createTrackFragmentRunBox = function(track) {
        var trun = new mp4lib.boxes.TrackFragmentRunBox(), i, cts_base, sample_duration_present_flag;
        cts_base = track.samples[0].cts;
        sample_duration_present_flag = track.samples[0].duration > 0 ? 256 : 0;
        trun.version = 0;
        trun.flags = 1 | sample_duration_present_flag | 512 | (track.type === "video" ? 2048 : 0);
        trun.data_offset = 0;
        trun.samples_table = [];
        trun.sample_count = track.samples.length;
        for (i = 0; i < track.samples.length; i++) {
            var sample = {
                sample_duration: track.samples[i].duration,
                sample_size: track.samples[i].size,
                sample_composition_time_offset: track.samples[i].cts - track.samples[i].dts
            };
            if (sample.sample_composition_time_offset < 0) {
                trun.version = 1;
            }
            trun.samples_table.push(sample);
        }
        return trun;
    }, createMediaDataBox = function(track) {
        var mdat = new mp4lib.boxes.MediaDataBox();
        mdat.data = track.data;
        return mdat;
    }, doGenerateMediaSegment = function(tracks, sequenceNumber) {
        var moof_file, moof, i, length, data, trafs, mdatLength = 0, trackglobal = {}, mdatTracksTab, offset = 0;
        moof_file = new mp4lib.boxes.File();
        moof = new mp4lib.boxes.MovieFragmentBox();
        moof.boxes.push(createMovieFragmentHeaderBox(sequenceNumber));
        for (i = 0; i < tracks.length; i++) {
            moof.boxes.push(createTrackFragmentBox(tracks[i]));
        }
        moof_file.boxes.push(moof);
        length = moof_file.getLength();
        trafs = moof.getBoxesByType("traf");
        length += 8;
        mdatTracksTab = [ tracks.length ];
        for (i = 0; i < tracks.length; i++) {
            trafs[i].getBoxByType("trun").data_offset = length;
            length += tracks[i].data.length;
            mdatTracksTab[i] = tracks[i].data;
            mdatLength += mdatTracksTab[i].length;
        }
        trackglobal.data = new Uint8Array(mdatLength);
        for (i = 0; i < mdatTracksTab.length; i++) {
            trackglobal.data.set(mdatTracksTab[i], offset);
            offset += mdatTracksTab[i].length;
        }
        moof_file.boxes.push(createMediaDataBox(trackglobal));
        data = mp4lib.serialize(moof_file);
        return data;
    };
    return {
        generateInitSegment: doGenerateInitSegment,
        generateMediaSegment: doGenerateMediaSegment
    };
};

MediaPlayer.dependencies.Mp4Processor.prototype = {
    constructor: MediaPlayer.dependencies.Mp4Processor
};

MediaPlayer.dependencies.Notifier = function() {
    "use strict";
    var OBSERVABLE_ID_PROP = "observableId", system, id = 0, getId = function() {
        if (!this[OBSERVABLE_ID_PROP]) {
            id += 1;
            this[OBSERVABLE_ID_PROP] = "_id_" + id;
        }
        return this[OBSERVABLE_ID_PROP];
    };
    return {
        system: undefined,
        setup: function() {
            system = this.system;
            system.mapValue("notify", this.notify);
            system.mapValue("subscribe", this.subscribe);
            system.mapValue("unsubscribe", this.unsubscribe);
        },
        notify: function() {
            var eventId = arguments[0] + getId.call(this), event = new MediaPlayer.vo.Event();
            event.sender = this;
            event.type = arguments[0];
            event.data = arguments[1];
            event.error = arguments[2];
            event.timestamp = new Date().getTime();
            system.notify.call(system, eventId, event);
        },
        subscribe: function(eventName, observer, handler, oneShot) {
            if (!handler && observer[eventName]) {
                handler = observer[eventName] = observer[eventName].bind(observer);
            }
            if (!observer) throw "observer object cannot be null or undefined";
            if (!handler) throw "event handler cannot be null or undefined";
            eventName += getId.call(this);
            system.mapHandler(eventName, undefined, handler, oneShot);
        },
        unsubscribe: function(eventName, observer, handler) {
            handler = handler || observer[eventName];
            eventName += getId.call(this);
            system.unmapHandler(eventName, undefined, handler);
        }
    };
};

MediaPlayer.dependencies.Notifier.prototype = {
    constructor: MediaPlayer.dependencies.Notifier
};

MediaPlayer.dependencies.ProtectionController = function() {
    "use strict";
    var keySystems = null, pendingNeedKeyData = [], audioInfo, videoInfo, onTeardownKeySystem = function(kid) {
        if (this.debug) {
            this.debug.log("teardownKeySystem called kid=" + kid);
        }
    }, getMediaInfos = function(manifest, contentType) {
        var data = [];
        var current = 0;
        var infos = manifest.Period.AdaptationSet_asArray;
        for (var idx = 0; idx < infos.length; idx++) {
            var info = infos[idx];
            if (info.contentType == contentType) {
                data.push({
                    contentType: info.contentType,
                    mimeType: info.mimeType,
                    profiles: info.profiles,
                    contentProtection: info.ContentProtection,
                    codec: info.codecs ? info.mimeType + ';codecs="' + info.codecs + '"' : info.mimeType,
                    id: info.id,
                    index: current,
                    trackCount: info.Representation_asArray.length
                });
                current++;
            }
        }
        return data;
    }, onKeyMessage = function(e) {
        if (e.error) {
            this.debug.error(e.error);
        } else {
            var keyMessageEvent = e.data;
            this.protectionModel.keySystem.doLicenseRequest(keyMessageEvent.message, keyMessageEvent.defaultURL, keyMessageEvent.sessionToken);
        }
    }, onLicenseRequestComplete = function(e) {
        if (!e.error) {
            this.debug.log("DRM: License request successful.  Session ID = " + e.data.requestData.getSessionID());
            this.updateKeySession(e.data.requestData, e.data.message);
        } else {
            this.debug.error("DRM: License request failed! -- " + e.error);
        }
    }, onKeySystemSelected = function() {
        this.protectionModel.keySystem.subscribe(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, this);
        if (!this.keySystem) {
            this.keySystem = this.protectionModel.keySystem;
        }
        for (var i = 0; i < pendingNeedKeyData.length; i++) {
            this.createKeySession(pendingNeedKeyData[i]);
        }
        pendingNeedKeyData = [];
    }, onNeedKey = function(event) {
        if (event.data.initDataType !== "cenc") {
            this.debug.log("DRM:  Only 'cenc' initData is supported!  Ignoring initData of type: " + event.data.initDataType);
            return;
        }
        var abInitData = event.data.initData;
        if (ArrayBuffer.isView(abInitData)) {
            abInitData = abInitData.buffer;
        }
        if (this.keySystem) {
            this.createKeySession(abInitData);
        } else if (this.keySystem === undefined) {
            this.keySystem = null;
            pendingNeedKeyData.push(abInitData);
            try {
                this.protectionExt.autoSelectKeySystem(this.protectionExt.getSupportedKeySystems(abInitData), this, videoInfo, audioInfo);
            } catch (error) {
                this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, "DRM: Unable to select a key system from needkey initData. -- " + error.message);
            }
        } else {
            pendingNeedKeyData.push(abInitData);
        }
    }, onKeySystemAccessComplete = function(event) {
        if (!event.error) {
            this.log("KeySystem Access Granted");
        } else {
            this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, "DRM: KeySystem Access Denied! -- " + event.error);
        }
    }, onServerCertificateUpdated = function(event) {
        if (!event.error) {
            this.debug.log("DRM: License server certificate successfully updated.");
        } else {
            this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, "DRM: Failed to update license server certificate. -- " + event.error);
        }
    }, onKeySessionCreated = function(event) {
        if (!event.error) {
            this.debug.log("DRM: Session created.  SessionID = " + event.data.getSessionID());
        } else {
            this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, "DRM: Failed to create key session. -- " + event.error);
        }
    }, onKeyAdded = function() {
        this.debug.log("DRM: Key added.");
    }, onKeyError = function(event) {
        this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, "DRM: MediaKeyError - sessionId: " + event.data.sessionToken.getSessionID() + ".  " + event.data.error);
    }, onKeySessionClosed = function(event) {
        if (!event.error) {
            this.debug.log("DRM: Session closed.  SessionID = " + event.data);
        } else {
            this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, "DRM Failed to close key session. -- " + event.error);
        }
    }, onKeySessionRemoved = function(event) {
        if (!event.error) {
            this.debug.log("DRM: Session removed.  SessionID = " + event.data);
        } else {
            this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, "DRM: Failed to remove key session. -- " + event.error);
        }
    };
    return {
        system: undefined,
        log: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        protectionExt: undefined,
        keySystem: undefined,
        sessionType: "temporary",
        debug: undefined,
        teardownKeySystem: onTeardownKeySystem.bind(this),
        setup: function() {
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE] = onKeyMessage.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED] = onKeySystemSelected.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE] = onKeySystemAccessComplete.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY] = onNeedKey.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED] = onServerCertificateUpdated.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED] = onKeyAdded.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR] = onKeyError.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED] = onKeySessionCreated.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED] = onKeySessionClosed.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED] = onKeySessionRemoved.bind(this);
            this[MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE] = onLicenseRequestComplete.bind(this);
            keySystems = this.protectionExt.getKeySystems();
            this.protectionModel = this.system.getObject("protectionModel");
            this.protectionModel.init();
        },
        init: function(manifest) {
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, this);
            var videos = getMediaInfos(manifest, "video");
            var audios = getMediaInfos(manifest, "audio");
            videoInfo = videos.length > 0 ? videos[0] : undefined;
            audioInfo = audios.length > 0 ? audios[0] : undefined;
            var cp = manifest.Period.AdaptationSet_asArray[0].ContentProtection_asArray;
            var supportedKS = this.protectionExt.getSupportedKeySystemsFromContentProtection(cp);
            if (supportedKS && supportedKS.length > 0) {
                var ksSelected = {};
                var self = this;
                ksSelected[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED] = function(event) {
                    if (!event.error) {
                        self.keySystem = self.protectionModel.keySystem;
                        self.keySystem.subscribe(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, self);
                        for (var ksIdx = 0; ksIdx < supportedKS.length; ksIdx++) {
                            if (self.keySystem === supportedKS[ksIdx].ks) {
                                self.createKeySession(supportedKS[ksIdx].initData);
                                break;
                            }
                        }
                    } else {
                        self.debug.log("DRM: Could not select key system from ContentProtection elements!  Falling back to needkey mechanism...");
                        self.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, self);
                        self.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, self);
                    }
                    self.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, ksSelected);
                };
                this.keySystem = null;
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, ksSelected);
                this.protectionExt.autoSelectKeySystem(supportedKS, this, videoInfo, audioInfo);
            } else {
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, this);
            }
        },
        teardown: function() {
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, this);
            if (this.protectionModel.keySystem) {
                this.protectionModel.keySystem.unsubscribe(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, this);
            }
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, this);
            this.keySystem = undefined;
            this.protectionModel.teardown();
            this.protectionModel = undefined;
        },
        requestKeySystemAccess: function(ksConfiguration) {
            this.protectionModel.requestKeySystemAccess(ksConfiguration);
        },
        selectKeySystem: function(keySystemAccess) {
            if (this.protectionModel.keySystem) {
                throw new Error("DRM: KeySystem already selected!");
            }
            this.protectionModel.selectKeySystem(keySystemAccess);
        },
        createKeySession: function(initData) {
            var initDataForKS = MediaPlayer.dependencies.protection.CommonEncryption.getPSSHForKeySystem(this.keySystem, initData);
            if (initDataForKS) {
                try {
                    this.protectionModel.createKeySession(initDataForKS, this.sessionType);
                } catch (error) {
                    this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, "Error creating key session! " + error.message);
                }
            } else {
                this.log("Selected key system is " + this.keySystem.systemString + ".  needkey/encrypted event contains no initData corresponding to that key system!");
            }
        },
        updateKeySession: function(sessionToken, message) {
            this.protectionModel.updateKeySession(sessionToken, message);
        },
        loadKeySession: function(sessionID) {
            this.protectionModel.loadKeySession(sessionID);
        },
        removeKeySession: function(sessionToken) {
            this.protectionModel.removeKeySession(sessionToken);
        },
        closeKeySession: function(sessionToken) {
            this.protectionModel.closeKeySession(sessionToken);
        },
        setServerCertificate: function(serverCertificate) {
            this.protectionModel.setServerCertificate(serverCertificate);
        },
        setMediaElement: function(element) {
            this.protectionModel.setMediaElement(element);
        },
        setSessionType: function(sessionType) {
            this.sessionType = sessionType;
        },
        setProtectionData: function(data) {
            this.protectionExt.init(data);
        }
    };
};

MediaPlayer.dependencies.ProtectionController.eventList = {
    ENAME_PROTECTION_ERROR: "protectionError"
};

MediaPlayer.dependencies.ProtectionController.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionController
};

MediaPlayer.dependencies.ProtectionExtensions = function() {
    "use strict";
    this.system = undefined;
    this.debug = undefined;
    this.keySystems = [];
    this.clearkeyKeySystem = undefined;
};

MediaPlayer.dependencies.ProtectionExtensions.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionExtensions,
    setup: function() {
        var keySystem;
        keySystem = this.system.getObject("ksPlayReady");
        this.keySystems.push(keySystem);
        keySystem = this.system.getObject("ksWidevine");
        this.keySystems.push(keySystem);
        keySystem = this.system.getObject("ksClearKey");
        this.keySystems.push(keySystem);
        this.clearkeyKeySystem = keySystem;
    },
    init: function(protectionDataSet) {
        var getProtectionData = function(keySystemString) {
            var protData = null;
            if (protectionDataSet) {
                protData = keySystemString in protectionDataSet ? protectionDataSet[keySystemString] : null;
            }
            return protData;
        };
        for (var i = 0; i < this.keySystems.length; i++) {
            var keySystem = this.keySystems[i];
            keySystem.init(getProtectionData(keySystem.systemString));
        }
    },
    getKeySystems: function() {
        return this.keySystems;
    },
    getKeySystemBySystemString: function(systemString) {
        for (var i = 0; i < this.keySystems.length; i++) {
            if (this.keySystems[i].systemString === systemString) {
                return this.keySystems[i];
            }
        }
        return null;
    },
    isClearKey: function(keySystem) {
        return keySystem === this.clearkeyKeySystem;
    },
    initDataEquals: function(initData1, initData2) {
        if (initData1.byteLength === initData2.byteLength) {
            for (var j = 0; j < initData1.byteLength; j++) {
                if (initData1[j] !== initData2[j]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    },
    getSupportedKeySystemsFromContentProtection: function(cps) {
        var cp, ks, ksIdx, cpIdx, supportedKS = [];
        if (cps) {
            for (ksIdx = 0; ksIdx < this.keySystems.length; ++ksIdx) {
                ks = this.keySystems[ksIdx];
                for (cpIdx = 0; cpIdx < cps.length; ++cpIdx) {
                    cp = cps[cpIdx];
                    if (cp.schemeIdUri.toLowerCase() === ks.schemeIdURI) {
                        var initData = ks.getInitData(cp);
                        if (!!initData) {
                            supportedKS.push({
                                ks: this.keySystems[ksIdx],
                                initData: initData
                            });
                        }
                    }
                }
            }
        }
        return supportedKS;
    },
    getSupportedKeySystems: function(initData) {
        var ksIdx, supportedKS = [], pssh = MediaPlayer.dependencies.protection.CommonEncryption.parsePSSHList(initData);
        for (ksIdx = 0; ksIdx < this.keySystems.length; ++ksIdx) {
            if (this.keySystems[ksIdx].uuid in pssh) {
                supportedKS.push({
                    ks: this.keySystems[ksIdx],
                    initData: pssh[this.keySystems[ksIdx].uuid]
                });
            }
        }
        return supportedKS;
    },
    autoSelectKeySystem: function(supportedKS, protectionController, videoInfo, audioInfo) {
        if (supportedKS.length === 0) {
            throw new Error("DRM system for this content not supported by the player!");
        }
        var audioCapabilities = [], videoCapabilities = [];
        if (videoInfo) {
            videoCapabilities.push(new MediaPlayer.vo.protection.MediaCapability(videoInfo.codec));
        }
        if (audioInfo) {
            audioCapabilities.push(new MediaPlayer.vo.protection.MediaCapability(audioInfo.codec));
        }
        var ksConfig = new MediaPlayer.vo.protection.KeySystemConfiguration(audioCapabilities, videoCapabilities);
        var requestedKeySystems = [];
        for (var i = 0; i < supportedKS.length; i++) {
            requestedKeySystems.push({
                ks: supportedKS[i].ks,
                configs: [ ksConfig ]
            });
        }
        var self = this;
        (function(protCtrl) {
            var cbObj = {};
            cbObj[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE] = function(event) {
                protCtrl.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, this);
                if (!event.error) {
                    var keySystemAccess = event.data;
                    self.debug.info("KeySystem Access Granted (" + keySystemAccess.keySystem.systemString + ")!");
                    protCtrl.selectKeySystem(keySystemAccess);
                } else {
                    self.debug.log(event.error);
                }
            };
            protCtrl.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, cbObj);
            protCtrl.requestKeySystemAccess(requestedKeySystems);
        })(protectionController);
    }
};

MediaPlayer.models.ProtectionModel = {};

MediaPlayer.models.ProtectionModel.select = function() {
    var videoElement = document.createElement("video");
    if (MediaPlayer.models.ProtectionModel_21Jan2015.detect(videoElement)) {
        this.system.mapClass("protectionModel", MediaPlayer.models.ProtectionModel_21Jan2015);
    } else if (MediaPlayer.models.ProtectionModel_3Feb2014.detect(videoElement)) {
        this.system.mapClass("protectionModel", MediaPlayer.models.ProtectionModel_3Feb2014);
    } else if (MediaPlayer.models.ProtectionModel_01b.detect(videoElement)) {
        this.system.mapClass("protectionModel", MediaPlayer.models.ProtectionModel_01b);
    } else {
        var debug = this.system.getObject("debug");
        debug.log("No supported version of EME detected on this user agent!");
        debug.log("Attempts to play encrypted content will fail!");
    }
};

MediaPlayer.models.ProtectionModel.eventList = {
    ENAME_NEED_KEY: "needkey",
    ENAME_KEY_SYSTEM_ACCESS_COMPLETE: "keySystemAccessComplete",
    ENAME_KEY_SYSTEM_SELECTED: "keySystemSelected",
    ENAME_VIDEO_ELEMENT_SELECTED: "videoElementSelected",
    ENAME_SERVER_CERTIFICATE_UPDATED: "serverCertificateUpdated",
    ENAME_KEY_MESSAGE: "keyMessage",
    ENAME_KEY_ADDED: "keyAdded",
    ENAME_KEY_ERROR: "keyError",
    ENAME_KEY_SESSION_CREATED: "keySessionCreated",
    ENAME_KEY_SESSION_REMOVED: "keySessionRemoved",
    ENAME_KEY_SESSION_CLOSED: "keySessionClosed",
    ENAME_KEY_STATUSES_CHANGED: "keyStatusesChanged"
};

MediaPlayer.models.ProtectionModel_01b = function() {
    var videoElement = null, api = null, pendingSessions = [], sessions = [], moreSessionsAllowed, createEventHandler = function() {
        var self = this;
        return {
            handleEvent: function(event) {
                var sessionToken = null;
                switch (event.type) {
                  case api.needkey:
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, new MediaPlayer.vo.protection.NeedKey(event.initData, "cenc"));
                    break;

                  case api.keyerror:
                    sessionToken = findSessionByID(sessions, event.sessionId);
                    if (!sessionToken) {
                        sessionToken = findSessionByID(pendingSessions, event.sessionId);
                    }
                    if (sessionToken) {
                        var msg = "";
                        switch (event.errorCode.code) {
                          case 1:
                            msg += "MEDIA_KEYERR_UNKNOWN - An unspecified error occurred. This value is used for errors that don't match any of the other codes.";
                            break;

                          case 2:
                            msg += "MEDIA_KEYERR_CLIENT - The Key System could not be installed or updated.";
                            break;

                          case 3:
                            msg += "MEDIA_KEYERR_SERVICE - The message passed into update indicated an error from the license service.";
                            break;

                          case 4:
                            msg += "MEDIA_KEYERR_OUTPUT - There is no available output device with the required characteristics for the content protection system.";
                            break;

                          case 5:
                            msg += "MEDIA_KEYERR_HARDWARECHANGE - A hardware configuration change caused a content protection error.";
                            break;

                          case 6:
                            msg += "MEDIA_KEYERR_DOMAIN - An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.";
                            break;
                        }
                        msg += "  System Code = " + event.systemCode;
                        self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, new MediaPlayer.vo.protection.KeyError(sessionToken, msg));
                    } else {
                        self.log("No session token found for key error");
                    }
                    break;

                  case api.keyadded:
                    sessionToken = findSessionByID(sessions, event.sessionId);
                    if (!sessionToken) {
                        sessionToken = findSessionByID(pendingSessions, event.sessionId);
                    }
                    if (sessionToken) {
                        self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED, sessionToken);
                    } else {
                        self.log("No session token found for key added");
                    }
                    break;

                  case api.keymessage:
                    moreSessionsAllowed = event.sessionId !== null && event.sessionId !== undefined;
                    if (moreSessionsAllowed) {
                        sessionToken = findSessionByID(sessions, event.sessionId);
                        if (!sessionToken && pendingSessions.length > 0) {
                            sessionToken = pendingSessions.shift();
                            sessions.push(sessionToken);
                            sessionToken.sessionID = event.sessionId;
                        }
                    } else if (pendingSessions.length > 0) {
                        sessionToken = pendingSessions.shift();
                        sessions.push(sessionToken);
                        if (pendingSessions.length !== 0) {
                            self.errHandler.mediaKeyMessageError("Multiple key sessions were creates with a user-agent that does not support sessionIDs!! Unpredictable behavior ahead!");
                        }
                    }
                    if (sessionToken) {
                        sessionToken.keyMessage = event.message;
                        self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, new MediaPlayer.vo.protection.KeyMessage(sessionToken, event.message, event.defaultURL));
                    } else {
                        self.log("No session token found for key message");
                    }
                    break;
                }
            }
        };
    }, eventHandler = null, findSessionByID = function(sessionArray, sessionID) {
        if (!sessionID || !sessionArray) {
            return null;
        } else {
            var len = sessionArray.length;
            for (var i = 0; i < len; i++) {
                if (sessionArray[i].sessionID == sessionID) {
                    return sessionArray[i];
                }
            }
            return null;
        }
    }, removeEventListeners = function() {
        videoElement.removeEventListener(api.keyerror, eventHandler);
        videoElement.removeEventListener(api.needkey, eventHandler);
        videoElement.removeEventListener(api.keymessage, eventHandler);
        videoElement.removeEventListener(api.keyadded, eventHandler);
    };
    return {
        system: undefined,
        log: undefined,
        errHandler: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        protectionExt: undefined,
        keySystem: null,
        setup: function() {
            eventHandler = createEventHandler.call(this);
        },
        init: function() {
            var tmpVideoElement = document.createElement("video");
            api = MediaPlayer.models.ProtectionModel_01b.detect(tmpVideoElement);
        },
        teardown: function() {
            if (videoElement) {
                removeEventListeners();
            }
            for (var i = 0; i < sessions.length; i++) {
                this.closeKeySession(sessions[i]);
            }
        },
        requestKeySystemAccess: function(ksConfigurations) {
            var ve = videoElement;
            if (!ve) {
                ve = document.createElement("video");
            }
            var found = false;
            for (var ksIdx = 0; ksIdx < ksConfigurations.length; ksIdx++) {
                var systemString = ksConfigurations[ksIdx].ks.systemString;
                var configs = ksConfigurations[ksIdx].configs;
                var supportedAudio = null;
                var supportedVideo = null;
                for (var configIdx = 0; configIdx < configs.length; configIdx++) {
                    var videos = configs[configIdx].videoCapabilities;
                    if (videos && videos.length !== 0) {
                        supportedVideo = [];
                        for (var videoIdx = 0; videoIdx < videos.length; videoIdx++) {
                            if (ve.canPlayType(videos[videoIdx].contentType, systemString) !== "") {
                                supportedVideo.push(videos[videoIdx]);
                            }
                        }
                    }
                    if (!supportedAudio && !supportedVideo || supportedAudio && supportedAudio.length === 0 || supportedVideo && supportedVideo.length === 0) {
                        continue;
                    }
                    found = true;
                    var ksConfig = new MediaPlayer.vo.protection.KeySystemConfiguration(supportedAudio, supportedVideo);
                    var ks = this.protectionExt.getKeySystemBySystemString(systemString);
                    var ksAccess = new MediaPlayer.vo.protection.KeySystemAccess(ks, ksConfig);
                    this.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, ksAccess);
                    break;
                }
            }
            if (!found) {
                this.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, null, "Key system access denied! -- No valid audio/video content configurations detected!");
            }
        },
        selectKeySystem: function(keySystemAccess) {
            this.keySystem = keySystemAccess.keySystem;
            this.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED);
        },
        setMediaElement: function(mediaElement) {
            if (videoElement) {
                removeEventListeners();
            }
            videoElement = mediaElement;
            videoElement.addEventListener(api.keyerror, eventHandler);
            videoElement.addEventListener(api.needkey, eventHandler);
            videoElement.addEventListener(api.keymessage, eventHandler);
            videoElement.addEventListener(api.keyadded, eventHandler);
            this.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_VIDEO_ELEMENT_SELECTED);
        },
        createKeySession: function(initData) {
            if (!this.keySystem) {
                throw new Error("Can not create sessions until you have selected a key system");
            }
            var i;
            for (i = 0; i < sessions.length; i++) {
                if (this.protectionExt.initDataEquals(initData, sessions[i].initData)) {
                    return;
                }
            }
            for (i = 0; i < pendingSessions.length; i++) {
                if (this.protectionExt.initDataEquals(initData, pendingSessions[i].initData)) {
                    return;
                }
            }
            if (moreSessionsAllowed || sessions.length === 0) {
                var newSession = {
                    prototype: new MediaPlayer.models.SessionToken().prototype,
                    sessionID: null,
                    initData: initData,
                    getSessionID: function() {
                        return this.sessionID;
                    }
                };
                pendingSessions.push(newSession);
                videoElement[api.generateKeyRequest](this.keySystem.systemString, new Uint8Array(initData));
                return newSession;
            } else {
                throw new Error("Multiple sessions not allowed!");
            }
        },
        updateKeySession: function(sessionToken, message) {
            var sessionID = sessionToken.sessionID;
            if (!this.protectionExt.isClearKey(this.keySystem)) {
                videoElement[api.addKey](this.keySystem.systemString, message, sessionToken.initData, sessionID);
            } else {
                for (var i = 0; i < message.keyPairs.length; i++) {
                    videoElement[api.addKey](this.keySystem.systemString, message.keyPairs[i].key, message.keyPairs[i].keyID, sessionID);
                }
            }
        },
        closeKeySession: function(sessionToken) {
            videoElement[api.cancelKeyRequest](this.keySystem.systemString, sessionToken.sessionID);
        },
        setServerCertificate: function() {},
        loadKeySession: function() {},
        removeKeySession: function() {}
    };
};

MediaPlayer.models.ProtectionModel_01b.prototype = {
    constructor: MediaPlayer.models.ProtectionModel_01b
};

MediaPlayer.models.ProtectionModel_01b.APIs = [ {
    generateKeyRequest: "generateKeyRequest",
    addKey: "addKey",
    cancelKeyRequest: "cancelKeyRequest",
    needkey: "needkey",
    keyerror: "keyerror",
    keyadded: "keyadded",
    keymessage: "keymessage"
}, {
    generateKeyRequest: "webkitGenerateKeyRequest",
    addKey: "webkitAddKey",
    cancelKeyRequest: "webkitCancelKeyRequest",
    needkey: "webkitneedkey",
    keyerror: "webkitkeyerror",
    keyadded: "webkitkeyadded",
    keymessage: "webkitkeymessage"
} ];

MediaPlayer.models.ProtectionModel_01b.detect = function(videoElement) {
    var apis = MediaPlayer.models.ProtectionModel_01b.APIs;
    for (var i = 0; i < apis.length; i++) {
        var api = apis[i];
        if (typeof videoElement[api.generateKeyRequest] !== "function") {
            continue;
        }
        if (typeof videoElement[api.addKey] !== "function") {
            continue;
        }
        if (typeof videoElement[api.cancelKeyRequest] !== "function") {
            continue;
        }
        return api;
    }
    return null;
};

MediaPlayer.models.ProtectionModel_21Jan2015 = function() {
    var videoElement = null, mediaKeys = null, sessions = [], requestKeySystemAccessInternal = function(ksConfigurations, idx) {
        var self = this;
        (function(i) {
            var keySystem = ksConfigurations[i].ks;
            var configs = ksConfigurations[i].configs;
            navigator.requestMediaKeySystemAccess(keySystem.systemString, configs).then(function(mediaKeySystemAccess) {
                var configuration = typeof mediaKeySystemAccess.getConfiguration === "function" ? mediaKeySystemAccess.getConfiguration() : null;
                var keySystemAccess = new MediaPlayer.vo.protection.KeySystemAccess(keySystem, configuration);
                keySystemAccess.mksa = mediaKeySystemAccess;
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, keySystemAccess);
            }).catch(function() {
                if (++i < ksConfigurations.length) {
                    requestKeySystemAccessInternal.call(self, ksConfigurations, i);
                } else {
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, null, "Key system access denied!");
                }
            });
        })(idx);
    }, createEventHandler = function() {
        var self = this;
        return {
            handleEvent: function(event) {
                switch (event.type) {
                  case "encrypted":
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, new MediaPlayer.vo.protection.NeedKey(event.initData, event.initDataType));
                    break;
                }
            }
        };
    }, eventHandler = null, removeSession = function(token) {
        for (var i = 0; i < sessions.length; i++) {
            if (sessions[i] === token) {
                sessions.splice(i, 1);
                break;
            }
        }
    }, createSessionToken = function(session, initData) {
        var self = this;
        var token = {
            prototype: new MediaPlayer.models.SessionToken().prototype,
            session: session,
            initData: initData,
            handleEvent: function(event) {
                switch (event.type) {
                  case "keystatuseschange":
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_STATUSES_CHANGED, this);
                    break;

                  case "message":
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, new MediaPlayer.vo.protection.KeyMessage(this, event.message, undefined, event.messageType));
                    break;
                }
            },
            getSessionID: function() {
                return this.session.sessionId;
            },
            getExpirationTime: function() {
                return this.session.expiration;
            },
            getKeyStatuses: function() {
                return this.session.keyStatuses;
            }
        };
        session.addEventListener("keystatuseschange", token);
        session.addEventListener("message", token);
        session.closed.then(function() {
            removeSession(token);
            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, token.getSessionID());
        });
        sessions.push(token);
        return token;
    };
    return {
        system: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        protectionExt: undefined,
        keySystem: null,
        setup: function() {
            eventHandler = createEventHandler.call(this);
        },
        init: function() {},
        teardown: function() {
            if (videoElement) {
                videoElement.removeEventListener("encrypted", eventHandler);
            }
            for (var i = 0; i < sessions.length; i++) {
                this.closeKeySession(sessions[i]);
            }
        },
        requestKeySystemAccess: function(ksConfigurations) {
            requestKeySystemAccessInternal.call(this, ksConfigurations, 0);
        },
        selectKeySystem: function(keySystemAccess) {
            var self = this;
            keySystemAccess.mksa.createMediaKeys().then(function(mkeys) {
                self.keySystem = keySystemAccess.keySystem;
                mediaKeys = mkeys;
                if (videoElement) {
                    videoElement.setMediaKeys(mediaKeys);
                }
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED);
            }).catch(function() {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, null, "Error selecting keys system (" + keySystemAccess.keySystem.systemString + ")! Could not create MediaKeys -- TODO");
            });
        },
        setMediaElement: function(mediaElement) {
            if (videoElement) {
                videoElement.removeEventListener("encrypted", eventHandler);
            }
            videoElement = mediaElement;
            videoElement.addEventListener("encrypted", eventHandler);
            if (mediaKeys) {
                videoElement.setMediaKeys(mediaKeys);
            }
        },
        setServerCertificate: function(serverCertificate) {
            if (!this.keySystem || !mediaKeys) {
                throw new Error("Can not set server certificate until you have selected a key system");
            }
            var self = this;
            mediaKeys.setServerCertificate(serverCertificate).then(function() {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED);
            }).catch(function(error) {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED, null, "Error updating server certificate -- " + error.name);
            });
        },
        createKeySession: function(initData, sessionType) {
            if (!this.keySystem || !mediaKeys) {
                throw new Error("Can not create sessions until you have selected a key system");
            }
            for (var i = 0; i < sessions.length; i++) {
                if (this.protectionExt.initDataEquals(initData, sessions[i].initData)) {
                    return;
                }
            }
            var session = mediaKeys.createSession(sessionType);
            var sessionToken = createSessionToken.call(this, session, initData);
            var self = this;
            session.generateRequest("cenc", initData).then(function() {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, sessionToken);
            }).catch(function(error) {
                removeSession(sessionToken);
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, null, "Error generating key request -- " + error.name);
            });
        },
        updateKeySession: function(sessionToken, message) {
            var session = sessionToken.session;
            var self = this;
            if (this.protectionExt.isClearKey(this.keySystem)) {
                message = message.toJWK();
            }
            session.update(message).catch(function(error) {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, new MediaPlayer.vo.protection.KeyError(sessionToken, "Error sending update() message! " + error.name));
            });
        },
        loadKeySession: function(sessionID) {
            if (!this.keySystem || !mediaKeys) {
                throw new Error("Can not load sessions until you have selected a key system");
            }
            var session = mediaKeys.createSession();
            var self = this;
            session.load(sessionID).then(function(success) {
                if (success) {
                    var sessionToken = createSessionToken.call(this, session);
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, sessionToken);
                } else {
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, null, "Could not load session! Invalid Session ID (" + sessionID + ")");
                }
            }).catch(function(error) {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, null, "Could not load session (" + sessionID + ")! " + error.name);
            });
        },
        removeKeySession: function(sessionToken) {
            var session = sessionToken.session;
            var self = this;
            session.remove().then(function() {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED, sessionToken.getSessionID());
            }).catch(function(error) {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED, null, "Error removing session (" + sessionToken.getSessionID() + "). " + error.name);
            });
        },
        closeKeySession: function(sessionToken) {
            var session = sessionToken.session;
            session.removeEventListener("keystatuseschange", sessionToken);
            session.removeEventListener("message", sessionToken);
            var self = this;
            session.close().catch(function(error) {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, null, "Error closing session (" + sessionToken.getSessionID() + ") " + error.name);
            });
        }
    };
};

MediaPlayer.models.ProtectionModel_21Jan2015.detect = function(videoElement) {
    if (videoElement.onencrypted === undefined || videoElement.mediaKeys === undefined) {
        return false;
    }
    if (navigator.requestMediaKeySystemAccess === undefined || typeof navigator.requestMediaKeySystemAccess !== "function") {
        return false;
    }
    return true;
};

MediaPlayer.models.ProtectionModel_21Jan2015.prototype = {
    constructor: MediaPlayer.models.ProtectionModel_21Jan2015
};

MediaPlayer.models.ProtectionModel_3Feb2014 = function() {
    var videoElement = null, mediaKeys = null, keySystemAccess = null, api = null, sessions = [], createEventHandler = function() {
        var self = this;
        return {
            handleEvent: function(event) {
                switch (event.type) {
                  case api.needkey:
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, new MediaPlayer.vo.protection.NeedKey(event.initData, "cenc"));
                    break;
                }
            }
        };
    }, eventHandler = null, setMediaKeys = function() {
        var doSetKeys = function() {
            videoElement[api.setMediaKeys](mediaKeys);
            this.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_VIDEO_ELEMENT_SELECTED);
        };
        if (videoElement.readyState >= 1) {
            doSetKeys.call(this);
        } else {
            videoElement.addEventListener("loadedmetadata", doSetKeys.bind(this));
        }
    }, createSessionToken = function(keySession, initData) {
        var self = this;
        return {
            prototype: new MediaPlayer.models.SessionToken().prototype,
            session: keySession,
            initData: initData,
            handleEvent: function(event) {
                switch (event.type) {
                  case api.error:
                    var errorStr = "KeyError";
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, new MediaPlayer.vo.protection.KeyError(this, errorStr));
                    break;

                  case api.message:
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, new MediaPlayer.vo.protection.KeyMessage(this, event.message, event.destinationURL));
                    break;

                  case api.ready:
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED, this);
                    break;

                  case api.close:
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, this.getSessionID());
                    break;
                }
            },
            getSessionID: function() {
                return this.session.sessionId;
            }
        };
    };
    return {
        system: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        protectionExt: undefined,
        keySystem: null,
        setup: function() {
            eventHandler = createEventHandler.call(this);
        },
        init: function() {
            var tmpVideoElement = document.createElement("video");
            api = MediaPlayer.models.ProtectionModel_3Feb2014.detect(tmpVideoElement);
        },
        teardown: function() {
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler);
            }
            for (var i = 0; i < sessions.length; i++) {
                this.closeKeySession(sessions[i]);
            }
        },
        requestKeySystemAccess: function(ksConfigurations) {
            var found = false;
            for (var ksIdx = 0; ksIdx < ksConfigurations.length; ksIdx++) {
                var systemString = ksConfigurations[ksIdx].ks.systemString;
                var configs = ksConfigurations[ksIdx].configs;
                var supportedAudio = null;
                var supportedVideo = null;
                for (var configIdx = 0; configIdx < configs.length; configIdx++) {
                    var audios = configs[configIdx].audioCapabilities;
                    var videos = configs[configIdx].videoCapabilities;
                    if (audios && audios.length !== 0) {
                        supportedAudio = [];
                        for (var audioIdx = 0; audioIdx < audios.length; audioIdx++) {
                            if (window[api.MediaKeys].isTypeSupported(systemString, audios[audioIdx].contentType)) {
                                supportedAudio.push(audios[audioIdx]);
                            }
                        }
                    }
                    if (videos && videos.length !== 0) {
                        supportedVideo = [];
                        for (var videoIdx = 0; videoIdx < videos.length; videoIdx++) {
                            if (window[api.MediaKeys].isTypeSupported(systemString, videos[videoIdx].contentType)) {
                                supportedVideo.push(videos[videoIdx]);
                            }
                        }
                    }
                    if (!supportedAudio && !supportedVideo || supportedAudio && supportedAudio.length === 0 || supportedVideo && supportedVideo.length === 0) {
                        continue;
                    }
                    found = true;
                    var ksConfig = new MediaPlayer.vo.protection.KeySystemConfiguration(supportedAudio, supportedVideo);
                    var ks = this.protectionExt.getKeySystemBySystemString(systemString);
                    var ksAccess = new MediaPlayer.vo.protection.KeySystemAccess(ks, ksConfig);
                    this.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, ksAccess);
                    break;
                }
            }
            if (!found) {
                this.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, null, "Key system access denied! -- No valid audio/video content configurations detected!");
            }
        },
        selectKeySystem: function(ksAccess) {
            try {
                mediaKeys = ksAccess.mediaKeys = new window[api.MediaKeys](ksAccess.keySystem.systemString);
                this.keySystem = ksAccess.keySystem;
                keySystemAccess = ksAccess;
                if (videoElement) {
                    setMediaKeys.call(this);
                }
                this.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED);
            } catch (error) {
                this.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, null, "Error selecting keys system (" + this.keySystem.systemString + ")! Could not create MediaKeys -- TODO");
            }
        },
        setMediaElement: function(mediaElement) {
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler);
            }
            videoElement = mediaElement;
            videoElement.addEventListener(api.needkey, eventHandler);
            if (mediaKeys) {
                setMediaKeys.call(this);
            }
        },
        createKeySession: function(initData) {
            if (!this.keySystem || !mediaKeys || !keySystemAccess) {
                throw new Error("Can not create sessions until you have selected a key system");
            }
            for (var i = 0; i < sessions.length; i++) {
                if (this.protectionExt.initDataEquals(initData, sessions[i].initData)) {
                    return;
                }
            }
            var contentType = keySystemAccess.ksConfiguration.videoCapabilities[0].contentType;
            var session = mediaKeys.createSession(contentType, new Uint8Array(initData));
            var sessionToken = createSessionToken.call(this, session, initData);
            session.addEventListener(api.error, sessionToken);
            session.addEventListener(api.message, sessionToken);
            session.addEventListener(api.ready, sessionToken);
            session.addEventListener(api.close, sessionToken);
            sessions.push(sessionToken);
            this.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, sessionToken);
        },
        updateKeySession: function(sessionToken, message) {
            var session = sessionToken.session;
            if (!this.protectionExt.isClearKey(this.keySystem)) {
                session.update(message);
            } else {
                session.update(new Uint8Array(message.toJWK()));
            }
        },
        closeKeySession: function(sessionToken) {
            var session = sessionToken.session;
            session.removeEventListener(api.error, sessionToken);
            session.removeEventListener(api.message, sessionToken);
            session.removeEventListener(api.ready, sessionToken);
            session.removeEventListener(api.close, sessionToken);
            for (var i = 0; i < sessions.length; i++) {
                if (sessions[i] === sessionToken) {
                    sessions.splice(i, 1);
                    break;
                }
            }
            session[api.release]();
        },
        setServerCertificate: function() {},
        loadKeySession: function() {},
        removeKeySession: function() {}
    };
};

MediaPlayer.models.ProtectionModel_3Feb2014.APIs = [ {
    setMediaKeys: "setMediaKeys",
    MediaKeys: "MediaKeys",
    release: "close",
    needkey: "needkey",
    error: "keyerror",
    message: "keymessage",
    ready: "keyadded",
    close: "keyclose"
}, {
    setMediaKeys: "msSetMediaKeys",
    MediaKeys: "MSMediaKeys",
    release: "close",
    needkey: "msneedkey",
    error: "mskeyerror",
    message: "mskeymessage",
    ready: "mskeyadded",
    close: "mskeyclose"
} ];

MediaPlayer.models.ProtectionModel_3Feb2014.detect = function(videoElement) {
    var apis = MediaPlayer.models.ProtectionModel_3Feb2014.APIs;
    for (var i = 0; i < apis.length; i++) {
        var api = apis[i];
        if (typeof videoElement[api.setMediaKeys] !== "function") {
            continue;
        }
        if (typeof window[api.MediaKeys] !== "function") {
            continue;
        }
        return api;
    }
    return null;
};

MediaPlayer.models.ProtectionModel_3Feb2014.prototype = {
    constructor: MediaPlayer.models.ProtectionModel_3Feb2014
};

MediaPlayer.dependencies.RequestScheduler = function() {
    "use strict";
    var schedulerModels = [], periodicExecuteInterval = null, periodicExecuteId = null, isCheckingForVideoTimeTriggersStarted = false, PERIODICALLY_TRIGGERED_TASK = 0, WALL_TIME_TRIGGERED_TASK = 1, VIDEO_TIME_TRIGGERED_TASK = 2, setVideoTimeTrigger = function(executeContext, executeFunction, dueTime) {
        if (!executeContext || !executeFunction) return;
        var schedulerModel;
        schedulerModel = registerSchedulerModel.call(this, executeContext, VIDEO_TIME_TRIGGERED_TASK);
        schedulerModel.setScheduledTask(executeFunction);
        schedulerModel.setIsScheduled(true);
        schedulerModel.setExecuteTime(dueTime);
        if (!isCheckingForVideoTimeTriggersStarted) {
            startCheckingDueTimeForVideoTimeTrigger.call(this);
        }
    }, startCheckingDueTimeForVideoTimeTrigger = function() {
        var element = this.videoModel.getElement();
        this.schedulerExt.attachScheduleListener(element, checkDueTimeForVideoTimeTriggers.bind(this));
        this.schedulerExt.attachUpdateScheduleListener(element, onUpdateSchedule.bind(this));
        isCheckingForVideoTimeTriggersStarted = true;
    }, checkDueTimeForVideoTimeTriggers = function() {
        var videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK), ln = videoTimeTriggers.length, now = this.videoModel.getCurrentTime(), model, due, i;
        for (i = 0; i < ln; i += 1) {
            model = videoTimeTriggers[i];
            due = model.getExecuteTime();
            if (model.getIsScheduled() && now > due) {
                model.executeScheduledTask();
                model.setIsScheduled(false);
            }
        }
    }, removeVideoTimeTrigger = function(executeContext) {
        var schedulerModel = findSchedulerModel(executeContext, VIDEO_TIME_TRIGGERED_TASK), videoTimeTriggers;
        if (schedulerModel) {
            unregisterSchedulerModel(schedulerModel);
            videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK);
            if (videoTimeTriggers.length === 0) {
                stopCheckingDueTimeForVideoTimeTrigger.call(this);
            }
        }
    }, stopCheckingDueTimeForVideoTimeTrigger = function() {
        var element = this.videoModel.getElement();
        this.schedulerExt.detachScheduleListener(element, checkDueTimeForVideoTimeTriggers.bind(this));
        this.schedulerExt.detachUpdateScheduleListener(element, onUpdateSchedule.bind(this));
        isCheckingForVideoTimeTriggersStarted = false;
    }, onUpdateSchedule = function() {
        rescheduleVideoTimeTriggers.call(this);
        checkDueTimeForVideoTimeTriggers.call(this);
    }, rescheduleVideoTimeTriggers = function() {
        var videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK), ln = videoTimeTriggers.length, i;
        for (i = 0; i < ln; i += 1) {
            videoTimeTriggers[i].setIsScheduled(true);
        }
    }, setTriggerForWallTime = function(executeContext, executeFunction, wallTime) {
        if (!executeContext || !executeFunction) return;
        var executeTimeout = wallTime.getTime() - new Date().getTime(), executeId, schedulerModel;
        schedulerModel = registerSchedulerModel.call(this, executeContext, WALL_TIME_TRIGGERED_TASK);
        schedulerModel.setScheduledTask(executeFunction);
        executeId = setTimeout(function() {
            schedulerModel.executeScheduledTask();
            unregisterSchedulerModel(schedulerModel);
        }, executeTimeout);
        schedulerModel.setExecuteId(executeId);
    }, removeTriggerForWallTime = function(executeContext) {
        var schedulerModel = findSchedulerModel(executeContext, WALL_TIME_TRIGGERED_TASK);
        if (schedulerModel) {
            clearTimeout(schedulerModel.getExecuteId());
            unregisterSchedulerModel(schedulerModel);
        }
    }, startScheduling = function(executeContext, executeFunction) {
        if (!executeContext || !executeFunction) return;
        var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK);
        if (!schedulerModel) {
            schedulerModel = registerSchedulerModel.call(this, executeContext, PERIODICALLY_TRIGGERED_TASK);
        }
        schedulerModel.setIsScheduled(true);
        schedulerModel.setScheduledTask(executeFunction);
        startPeriodicScheduleListener.call(this);
        executeFunction.call(executeContext);
    }, onScheduledTimeOccurred = function() {
        runScheduledTasks.call(this);
    }, runScheduledTasks = function() {
        var self = this, schedulerModel, periodicModels = getAllModelsForType.call(self, PERIODICALLY_TRIGGERED_TASK), ln = periodicModels.length, i;
        for (i = 0; i < ln; i += 1) {
            schedulerModel = periodicModels[i];
            if (schedulerModel.getIsScheduled()) {
                schedulerModel.executeScheduledTask();
            }
        }
    }, startPeriodicScheduleListener = function() {
        if (periodicExecuteId !== null) return;
        this.adjustExecuteInterval();
        periodicExecuteId = setInterval(onScheduledTimeOccurred.bind(this), periodicExecuteInterval);
    }, stopPeriodicScheduling = function(executeContext) {
        var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK), periodicModels = getAllModelsForType.call(this, PERIODICALLY_TRIGGERED_TASK);
        if (schedulerModel) {
            unregisterSchedulerModel(schedulerModel);
            if (periodicModels.length === 0) {
                stopPeriodicScheduleListener.call(this);
            }
        }
    }, stopPeriodicScheduleListener = function() {
        clearInterval(periodicExecuteId);
        periodicExecuteId = null;
    }, registerSchedulerModel = function(executeContext, type) {
        if (!executeContext) return null;
        var model = this.system.getObject("schedulerModel");
        model.setContext(executeContext);
        model.setType(type);
        schedulerModels.push(model);
        return model;
    }, getAllModelsForType = function(type) {
        var models = [], model, i;
        for (i = 0; i < schedulerModels.length; i += 1) {
            model = schedulerModels[i];
            if (model.getType() === type) {
                models.push(model);
            }
        }
        return models;
    }, unregisterSchedulerModel = function(schedulerModel) {
        var index = schedulerModels.indexOf(schedulerModel);
        if (index !== -1) {
            schedulerModels.splice(index, 1);
        }
    }, findSchedulerModel = function(executeContext, type) {
        for (var i = 0; i < schedulerModels.length; i++) {
            if (schedulerModels[i].getContext() === executeContext && schedulerModels[i].getType() === type) {
                return schedulerModels[i];
            }
        }
        return null;
    };
    return {
        system: undefined,
        videoModel: undefined,
        debug: undefined,
        schedulerExt: undefined,
        isScheduled: function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK);
            return !!schedulerModel && schedulerModel.getIsScheduled();
        },
        getExecuteInterval: function() {
            return periodicExecuteInterval;
        },
        adjustExecuteInterval: function() {
            if (schedulerModels.length < 1) return;
            var newExecuteInterval = this.schedulerExt.getExecuteInterval(schedulerModels[0].getContext());
            if (periodicExecuteInterval !== newExecuteInterval) {
                periodicExecuteInterval = newExecuteInterval;
                if (periodicExecuteId !== null) {
                    this.debug.log("Changing execute interval: " + periodicExecuteInterval);
                    clearInterval(periodicExecuteId);
                    periodicExecuteId = setInterval(onScheduledTimeOccurred.bind(this), periodicExecuteInterval);
                }
            }
        },
        startScheduling: startScheduling,
        stopScheduling: stopPeriodicScheduling,
        setTriggerForVideoTime: setVideoTimeTrigger,
        setTriggerForWallTime: setTriggerForWallTime,
        removeTriggerForVideoTime: removeVideoTimeTrigger,
        removeTriggerForWallTime: removeTriggerForWallTime
    };
};

MediaPlayer.dependencies.RequestScheduler.prototype = {
    constructor: MediaPlayer.dependencies.RequestScheduler
};

MediaPlayer.dependencies.SchedulerExtensions = function() {
    "use strict";
};

MediaPlayer.dependencies.SchedulerExtensions.prototype = {
    constructor: MediaPlayer.dependencies.SchedulerExtensions,
    getExecuteInterval: function(context) {
        var interval = 1e3;
        if (typeof context.getMinBufferTime !== "undefined") {
            interval = context.getMinBufferTime() * 1e3 / 4;
            interval = Math.max(interval, 1e3);
        }
        return interval;
    },
    attachScheduleListener: function(element, scheduleListener) {
        element.addEventListener("timeupdate", scheduleListener);
    },
    detachScheduleListener: function(element, scheduleListener) {
        element.removeEventListener("timeupdate", scheduleListener);
    },
    attachUpdateScheduleListener: function(element, updateScheduleListener) {
        element.addEventListener("seeking", updateScheduleListener);
    },
    detachUpdateScheduleListener: function(element, updateScheduleListener) {
        element.removeEventListener("seeking", updateScheduleListener);
    }
};

MediaPlayer.dependencies.SchedulerModel = function() {
    "use strict";
    var context, scheduledTask, type, executeTime, executeId, isScheduled = false;
    return {
        system: undefined,
        debug: undefined,
        schedulerExt: undefined,
        setContext: function(value) {
            context = value;
        },
        getContext: function() {
            return context;
        },
        setScheduledTask: function(value) {
            scheduledTask = value;
        },
        executeScheduledTask: function() {
            scheduledTask.call(context);
        },
        setExecuteTime: function(value) {
            executeTime = value;
        },
        getExecuteTime: function() {
            return executeTime;
        },
        setExecuteId: function(value) {
            executeId = value;
        },
        getExecuteId: function() {
            return executeId;
        },
        setType: function(value) {
            type = value;
        },
        getType: function() {
            return type;
        },
        setIsScheduled: function(value) {
            isScheduled = value;
        },
        getIsScheduled: function() {
            return isScheduled;
        }
    };
};

MediaPlayer.dependencies.SchedulerModel.prototype = {
    constructor: MediaPlayer.dependencies.SchedulerModel
};

MediaPlayer.dependencies.SourceBufferExtensions = function() {
    "use strict";
    this.system = undefined;
    this.manifestExt = undefined;
};

MediaPlayer.dependencies.SourceBufferExtensions.prototype = {
    constructor: MediaPlayer.dependencies.SourceBufferExtensions,
    createSourceBuffer: function(mediaSource, codec) {
        "use strict";
        var deferred = Q.defer(), self = this;
        try {
            deferred.resolve(mediaSource.addSourceBuffer(codec));
        } catch (ex) {
            if (!self.manifestExt.getIsTextTrack(codec)) {
                deferred.reject(ex.description);
            } else {
                deferred.resolve(self.system.getObject("textSourceBuffer"));
            }
        }
        return deferred.promise;
    },
    removeSourceBuffer: function(mediaSource, buffer) {
        "use strict";
        var deferred = Q.defer();
        try {
            deferred.resolve(mediaSource.removeSourceBuffer(buffer));
        } catch (ex) {
            if (buffer && typeof buffer.getTextTrackExtensions === "function") {
                deferred.resolve();
            } else {
                deferred.reject(ex.description);
            }
        }
        return deferred.promise;
    },
    getBufferRange: function(buffer, time, tolerance) {
        "use strict";
        var ranges = null, start = 0, end = 0, firstStart = null, lastEnd = null, gap = 0, toler = tolerance || .15, len, i;
        try {
            ranges = buffer.buffered;
        } catch (ex) {
            return Q.when(null);
        }
        if (ranges !== null) {
            for (i = 0, len = ranges.length; i < len; i += 1) {
                start = ranges.start(i);
                end = ranges.end(i);
                if (firstStart === null) {
                    gap = Math.abs(start - time);
                    if (time >= start && time < end) {
                        firstStart = start;
                        lastEnd = end;
                        continue;
                    } else if (gap <= toler) {
                        firstStart = start;
                        lastEnd = end;
                        continue;
                    }
                } else {
                    gap = start - lastEnd;
                    if (gap <= toler) {
                        lastEnd = end;
                    } else {
                        break;
                    }
                }
            }
            if (firstStart !== null) {
                return Q.when({
                    start: firstStart,
                    end: lastEnd
                });
            }
        }
        return Q.when(null);
    },
    getAllRanges: function(buffer) {
        var ranges = null;
        try {
            ranges = buffer.buffered;
            return Q.when(ranges);
        } catch (ex) {
            return Q.when(null);
        }
    },
    getBufferLength: function(buffer, time, tolerance) {
        "use strict";
        var self = this, deferred = Q.defer();
        self.getBufferRange(buffer, time, tolerance).then(function(range) {
            if (range === null) {
                deferred.resolve(0);
            } else {
                deferred.resolve(range.end - time);
            }
        });
        return deferred.promise;
    },
    waitForUpdateEnd: function(buffer) {
        "use strict";
        var defer = Q.defer(), intervalId, CHECK_INTERVAL = 50, checkIsUpdateEnded = function() {
            if (buffer.updating) return;
            clearInterval(intervalId);
            defer.resolve(true);
        }, updateEndHandler = function() {
            if (buffer.updating) return;
            buffer.removeEventListener("updateend", updateEndHandler, false);
            defer.resolve(true);
        };
        if (typeof buffer.addEventListener === "function") {
            try {
                buffer.addEventListener("updateend", updateEndHandler, false);
            } catch (err) {
                intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
            }
        } else {
            intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
        }
        return defer.promise;
    },
    append: function(buffer, bytes, sync) {
        var deferred = Q.defer();
        try {
            if ("append" in buffer) {
                buffer.append(bytes);
            } else if ("appendBuffer" in buffer) {
                buffer.appendBuffer(bytes);
            }
            if (sync) {
                deferred.resolve();
            } else {
                this.waitForUpdateEnd(buffer).then(function() {
                    deferred.resolve();
                });
            }
        } catch (err) {
            deferred.reject({
                err: err,
                data: bytes
            });
        }
        return deferred.promise;
    },
    remove: function(buffer, start, end, duration, mediaSource, sync) {
        var deferred = Q.defer();
        try {
            if (start >= 0 && start < duration && end > start && mediaSource.readyState !== "ended") {
                buffer.remove(start, end);
            }
            if (sync) {
                deferred.resolve();
            } else {
                this.waitForUpdateEnd(buffer).then(function() {
                    deferred.resolve();
                });
            }
        } catch (err) {
            deferred.reject(err);
        }
        return deferred.promise;
    },
    abort: function(mediaSource, buffer) {
        "use strict";
        var deferred = Q.defer();
        try {
            if (mediaSource.readyState === "open") {
                buffer.abort();
            }
            deferred.resolve();
        } catch (ex) {
            deferred.reject(ex.description);
        }
        return deferred.promise;
    }
};

MediaPlayer.dependencies.Stream = function() {
    "use strict";
    var manifest, mediaSource, videoCodec = null, audioCodec = null, contentProtection = null, videoController = null, videoTrackIndex = -1, audioController = null, audioTrackIndex = -1, textController = null, textTrackIndex = -1, autoPlay = true, initialized = false, load, errored = false, kid = null, initData = [], fullScreenListener, endedListener, loadedListener, playListener, pauseListener, errorListener, seekingListener, seekedListener, timeupdateListener, durationchangeListener, progressListener, ratechangeListener, canplayListener, playingListener, loadstartListener, waitingListener, periodInfo = null, isPaused = false, isSeeked = false, needKeyListener, keyMessageListener, keyAddedListener, keyErrorListener, initialSeekTime, checkStartTimeIntervalId, eventController = null, play = function() {
        this.debug.info("[Stream] Attempting play...");
        if (!initialized) {
            return;
        }
        this.debug.info("[Stream] Do play.");
        this.videoModel.play();
    }, pause = function() {
        this.debug.info("[Stream] Do pause.");
        this.videoModel.pause();
    }, seek = function(time) {
        this.debug.log("[Stream] Attempting seek...");
        if (!initialized) {
            return;
        }
        this.debug.info("[Stream] Do seek: " + time);
        this.system.notify("setCurrentTime");
        this.videoModel.setCurrentTime(time);
        updateBuffer.call(this).then(function() {
            startBuffering(time);
        });
    }, onMediaSourceNeedsKey = function(event) {
        var self = this, type;
        self.debug.log("[DRM] ### onMediaSourceNeedsKey (" + event.type + ")");
        type = videoCodec;
        initData.push({
            type: type,
            initData: event.initData
        });
        this.debug.log("[DRM] Key required for - " + type);
        if (!!contentProtection && !!videoCodec && !kid) {
            try {
                self.debug.log("[DRM] Select Key System");
                kid = self.protectionController.selectKeySystem(videoCodec, contentProtection);
            } catch (error) {
                pause.call(self);
                self.debug.log(error);
                self.errHandler.mediaKeySystemSelectionError(error);
                self.metricsModel.addState(self.type, "stopped", self.videoModel.getCurrentTime(), 2);
                self.reset();
            }
        }
        if (!!kid) {
            self.debug.log("[DRM] Ensure Key Session for KID " + kid);
            self.protectionController.ensureKeySession(kid, type, event.initData);
        }
    }, onMediaSourceKeyMessage = function(event) {
        var self = this, session = null, bytes = null, msg = null, laURL = null;
        self.debug.log("[DRM] ### onMediaSourceKeyMessage (" + event.type + ")");
        session = event.target;
        bytes = event.message[1] === 0 ? new Uint16Array(event.message.buffer) : new Uint8Array(event.message.buffer);
        msg = String.fromCharCode.apply(null, bytes);
        self.debug.log("[DRM] Key message: " + msg);
        laURL = event.destinationURL;
        self.debug.log("[DRM] laURL: " + laURL);
        var manifest = self.manifestModel.getValue();
        if (manifest.backUrl) {
            laURL = manifest.backUrl;
            self.debug.log("[DRM] backURL: " + laURL);
        }
        self.protectionController.updateFromMessage(kid, session, msg, laURL).fail(function(error) {
            pause.call(self);
            self.debug.log(error);
            self.errHandler.mediaKeyMessageError(error);
            self.metricsModel.addState(self.type, "stopped", self.videoModel.getCurrentTime(), 2);
            self.reset();
        });
    }, onMediaSourceKeyAdded = function() {
        this.debug.log("[DRM] ### onMediaSourceKeyAdded.");
    }, onMediaSourceKeyError = function() {
        var session = event.target, msg;
        this.debug.log("[DRM] ### onMediaSourceKeyError.");
        msg = "DRM: MediaKeyError - sessionId: " + session.sessionId + " errorCode: " + session.error.code + " systemErrorCode: " + session.error.systemCode + " [";
        switch (session.error.code) {
          case 1:
            msg += "MEDIA_KEYERR_UNKNOWN - An unspecified error occurred. This value is used for errors that don't match any of the other codes.";
            break;

          case 2:
            msg += "MEDIA_KEYERR_CLIENT - The Key System could not be installed or updated.";
            break;

          case 3:
            msg += "MEDIA_KEYERR_SERVICE - The message passed into update indicated an error from the license service.";
            break;

          case 4:
            msg += "MEDIA_KEYERR_OUTPUT - There is no available output device with the required characteristics for the content protection system.";
            break;

          case 5:
            msg += "MEDIA_KEYERR_HARDWARECHANGE - A hardware configuration change caused a content protection error.";
            break;

          case 6:
            msg += "MEDIA_KEYERR_DOMAIN - An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.";
            break;
        }
        msg += "]";
        this.debug.log(msg);
        this.errHandler.mediaKeySessionError(msg);
    }, setUpMediaSource = function(mediaSourceArg) {
        var deferred = Q.defer(), self = this, onMediaSourceOpen = function() {
            mediaSourceArg.removeEventListener("sourceopen", onMediaSourceOpen);
            mediaSourceArg.removeEventListener("webkitsourceopen", onMediaSourceOpen);
            deferred.resolve(mediaSourceArg);
        };
        mediaSourceArg.addEventListener("sourceopen", onMediaSourceOpen, false);
        mediaSourceArg.addEventListener("webkitsourceopen", onMediaSourceOpen, false);
        self.mediaSourceExt.attachMediaSource(mediaSourceArg, self.videoModel);
        return deferred.promise;
    }, tearDownMediaSource = function() {
        var self = this;
        if (!!videoController) {
            videoController.reset(errored);
        }
        if (!!audioController) {
            audioController.reset(errored);
        }
        if (!!textController) {
            textController.reset(errored);
        }
        if (!!eventController) {
            eventController.reset();
        }
        if (!!mediaSource) {
            self.mediaSourceExt.detachMediaSource(self.videoModel);
        }
        initialized = false;
        kid = null;
        initData = [];
        contentProtection = null;
        videoController = null;
        audioController = null;
        textController = null;
        videoCodec = null;
        audioCodec = null;
        mediaSource = null;
        manifest = null;
    }, checkIfInitialized = function(videoReady, audioReady, textTrackReady, deferred) {
        if (videoReady && audioReady && textTrackReady) {
            if (videoController === null && audioController === null && textController === null) {
                var msg = "No streams to play.";
                this.errHandler.manifestError(msg, "nostreams", manifest);
                this.debug.log(msg);
                deferred.reject();
            } else {
                deferred.resolve(true);
            }
        }
    }, initializeMediaSource = function() {
        var initialize = Q.defer(), videoReady = false, audioReady = false, textTrackReady = false, self = this;
        eventController = self.system.getObject("eventController");
        eventController.initialize(self.videoModel);
        self.manifestExt.getDuration(manifest, periodInfo).then(function() {
            self.manifestExt.getVideoData(manifest, periodInfo.index).then(function(videoData) {
                if (videoData !== null) {
                    self.manifestExt.getDataIndex(videoData, manifest, periodInfo.index).then(function(index) {
                        videoTrackIndex = index;
                    });
                    self.manifestExt.getCodec(videoData).then(function(codec) {
                        self.debug.info("[Stream] Video codec: " + codec);
                        videoCodec = codec;
                        return self.manifestExt.getContentProtectionData(videoData).then(function(contentProtectionData) {
                            self.debug.log("[Stream] video contentProtection");
                            if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                                self.debug.error("[Stream] mediakeys not supported!");
                                self.errHandler.capabilityError("mediakeys");
                                return Q.when(null);
                            }
                            contentProtection = contentProtectionData;
                            if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                var msg = "Video Codec (" + codec + ") is not supported.";
                                self.errHandler.manifestError(msg, "codec", manifest);
                                return Q.when(null);
                            }
                            return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                        });
                    }).then(function(buffer) {
                        if (buffer === null) {
                            self.debug.log("No buffer was created, skipping video stream.");
                        } else {
                            videoController = self.system.getObject("bufferController");
                            videoController.initialize("video", periodInfo, videoData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource, eventController);
                        }
                        videoReady = true;
                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                    }, function() {
                        self.errHandler.mediaSourceError("Error creating video source buffer.");
                        videoReady = true;
                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                    });
                } else {
                    self.debug.log("[Stream] No video data.");
                    videoReady = true;
                    checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                }
                return self.manifestExt.getAudioDatas(manifest, periodInfo.index);
            }).then(function(audioDatas) {
                if (audioDatas !== null && audioDatas.length > 0) {
                    self.manifestExt.getPrimaryAudioData(manifest, periodInfo.index).then(function(primaryAudioData) {
                        self.manifestExt.getDataIndex(primaryAudioData, manifest, periodInfo.index).then(function(index) {
                            audioTrackIndex = index;
                        });
                        self.manifestExt.getCodec(primaryAudioData).then(function(codec) {
                            self.debug.info("[Stream] Audio codec: " + codec);
                            audioCodec = codec;
                            return self.manifestExt.getContentProtectionData(primaryAudioData).then(function(contentProtectionData) {
                                self.debug.log("[Stream] Audio contentProtection");
                                if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                                    self.debug.error("[Stream] mediakeys not supported!");
                                    self.errHandler.capabilityError("mediakeys");
                                    return Q.when(null);
                                }
                                contentProtection = contentProtectionData;
                                if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                    var msg = "Audio Codec (" + codec + ") is not supported.";
                                    self.errHandler.manifestError(msg, "codec", manifest);
                                    self.debug.error("[Stream] ", msg);
                                    return Q.when(null);
                                }
                                return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                            });
                        }).then(function(buffer) {
                            if (buffer === null) {
                                self.debug.log("[Stream] No buffer was created, skipping audio stream.");
                            } else {
                                audioController = self.system.getObject("bufferController");
                                audioController.initialize("audio", periodInfo, primaryAudioData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource, eventController);
                            }
                            audioReady = true;
                            checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                        }, function() {
                            self.errHandler.mediaSourceError("Error creating audio source buffer.");
                            audioReady = true;
                            checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                        });
                    });
                } else {
                    self.debug.log("[Stream] No audio streams.");
                    audioReady = true;
                    checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                }
                return self.manifestExt.getTextDatas(manifest, periodInfo.index);
            }).then(function(textDatas) {
                var mimeType;
                if (textDatas !== null && textDatas.length > 0) {
                    self.debug.log("Have subtitles streams: " + textDatas.length);
                    self.manifestExt.getPrimaryTextData(manifest, periodInfo.index).then(function(primarySubtitleData) {
                        self.manifestExt.getDataIndex(primarySubtitleData, manifest, periodInfo.index).then(function(index) {
                            textTrackIndex = index;
                            self.debug.log("Save text track: " + textTrackIndex);
                        });
                        self.manifestExt.getMimeType(primarySubtitleData).then(function(type) {
                            mimeType = type;
                            return self.sourceBufferExt.createSourceBuffer(mediaSource, mimeType);
                        }).then(function(buffer) {
                            if (buffer === null) {
                                self.debug.log("Source buffer was not created for text track");
                            } else {
                                textController = self.system.getObject("bufferController");
                                textController.initialize("text", periodInfo, primarySubtitleData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource);
                                if (buffer.hasOwnProperty("initialize")) {
                                    buffer.initialize(mimeType, textController, primarySubtitleData);
                                }
                                textTrackReady = true;
                                checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                            }
                        }, function(error) {
                            self.debug.log("Error creating text source buffer:");
                            self.debug.log(error);
                            self.errHandler.mediaSourceError("Error creating text source buffer.");
                            textTrackReady = true;
                            checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                        });
                    });
                } else {
                    self.debug.log("[Stream] No text tracks.");
                    textTrackReady = true;
                    checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                }
                return self.manifestExt.getEventsForPeriod(manifest, periodInfo);
            }).then(function(events) {
                eventController.addInlineEvents(events);
            });
        });
        return initialize.promise;
    }, initializePlayback = function() {
        var self = this, initialize = Q.defer();
        self.manifestExt.getDuration(self.manifestModel.getValue(), periodInfo).then(function(duration) {
            self.debug.log("[Stream] Setting duration: " + duration);
            return self.mediaSourceExt.setDuration(mediaSource, duration);
        }).then(function() {
            initialized = true;
            initialize.resolve(true);
        });
        return initialize.promise;
    }, onLoad = function() {
        var self = this;
        this.debug.info("<video> loadedmetadata event");
        this.debug.log("[Stream] Got loadedmetadata event.");
        initialSeekTime = this.timelineConverter.calcPresentationStartTime(periodInfo);
        this.debug.info("[Stream] Starting playback at offset: " + initialSeekTime);
        if (initialSeekTime != this.videoModel.getCurrentTime()) {
            this.system.mapHandler("bufferUpdated", undefined, onBufferUpdated.bind(self));
        } else {
            load.resolve(null);
        }
    }, onCanPlay = function() {
        this.debug.info("<video> canplay event");
        this.debug.log("[Stream] Got canplay event.");
    }, onPlaying = function() {
        this.debug.info("<video> playing event");
        this.debug.log("[Stream] Got playing event.");
    }, onLoadStart = function() {
        this.debug.info("<video> loadstart event");
    }, onWaiting = function() {
        this.debug.info("<video> waiting event");
    }, onPlay = function() {
        this.debug.info("<video> play event");
        this.debug.log("[Stream] Got play event.");
        if (isPaused && !isSeeked) {
            startBuffering();
        }
        isPaused = false;
        isSeeked = false;
    }, onFullScreenChange = function() {
        var videoElement = this.videoModel.getElement(), isFullScreen = 0;
        if (document.webkitIsFullScreen || document.msFullscreenElement || document.mozFullScreen) {
            isFullScreen = 1;
        }
        this.metricsModel.addCondition(null, isFullScreen, videoElement.videoWidth, videoElement.videoHeight);
    }, onEnded = function() {
        this.debug.info("<video> ended event");
        this.metricsModel.addState("video", "stopped", this.videoModel.getCurrentTime(), 1);
    }, onPause = function() {
        this.debug.info("<video> pause event");
        isPaused = true;
        suspend.call(this);
    }, onError = function(event) {
        this.debug.info("<video> error event");
        var error = event.srcElement.error, code = error.code, msg = "";
        if (code === -1) {
            return;
        }
        switch (code) {
          case 1:
            msg = "MEDIA_ERR_ABORTED";
            break;

          case 2:
            msg = "MEDIA_ERR_NETWORK";
            break;

          case 3:
            msg = "MEDIA_ERR_DECODE";
            break;

          case 4:
            msg = "MEDIA_ERR_SRC_NOT_SUPPORTED";
            break;

          case 5:
            msg = "MEDIA_ERR_ENCRYPTED";
            break;
        }
        errored = true;
        this.debug.log("Video Element Error: " + msg);
        this.debug.log(error);
        this.errHandler.mediaSourceError(msg);
        this.reset();
    }, onSeeking = function() {
        var time = this.videoModel.getCurrentTime();
        this.debug.info("<video> seeking event: " + time);
        isSeeked = true;
        startBuffering(time);
    }, onSeeked = function() {
        this.debug.info("<video> seeked event");
        this.videoModel.listen("seeking", seekingListener);
        this.videoModel.unlisten("seeked", seekedListener);
    }, onProgress = function() {
        this.debug.info("<video> progress event");
    }, onTimeupdate = function() {
        this.debug.info("<video> timeupdate event: " + this.videoModel.getCurrentTime());
        updateBuffer.call(this);
    }, onDurationchange = function() {
        this.debug.info("<video> durationchange event: " + this.videoModel.getElement().duration);
    }, onRatechange = function() {
        this.debug.info("<video> ratechange event: " + this.videoModel.getElement().playbackRate);
        if (videoController) {
            videoController.updateStalledState();
        }
        if (audioController) {
            audioController.updateStalledState();
        }
        if (textController) {
            textController.updateStalledState();
        }
    }, updateBuffer = function() {
        if (videoController) {
            videoController.updateBufferState();
        }
        if (audioController) {
            audioController.updateBufferState();
        }
        if (textController) {
            textController.updateBufferState();
        }
    }, startBuffering = function(time) {
        if (videoController) {
            if (time === undefined) {
                videoController.start();
            } else {
                videoController.seek(time);
            }
        }
        if (audioController) {
            if (time === undefined) {
                audioController.start();
            } else {
                audioController.seek(time);
            }
        }
        if (textController) {
            if (time === undefined) {
                textController.start();
            } else {
                textController.seek(time);
            }
        }
    }, stopBuffering = function() {
        if (videoController) {
            videoController.stop();
        }
        if (audioController) {
            audioController.stop();
        }
        if (textController) {
            textController.stop();
        }
    }, suspend = function() {
        if (!this.scheduleWhilePaused || this.manifestExt.getIsDynamic(manifest)) {
            stopBuffering.call(this);
        }
        clearInterval(checkStartTimeIntervalId);
    }, doLoad = function(manifestResult) {
        var self = this;
        manifest = manifestResult;
        self.debug.log("[Stream] Create MediaSource");
        return self.mediaSourceExt.createMediaSource().then(function(mediaSourceResult) {
            self.debug.log("[Stream] Setup MediaSource");
            return setUpMediaSource.call(self, mediaSourceResult);
        }).then(function(mediaSourceResult) {
            mediaSource = mediaSourceResult;
            self.debug.log("[Stream] Initialize MediaSource");
            return initializeMediaSource.call(self);
        }).then(function() {
            self.debug.log("[Stream] Initialize playback");
            return initializePlayback.call(self);
        }).then(function() {
            self.debug.log("[Stream] Playback initialized");
            return load.promise;
        }).then(function() {
            self.debug.log("[Stream] element loaded!");
            if (periodInfo.index === 0) {
                eventController.start();
                if (autoPlay) {
                    play.call(self);
                }
            }
        });
    }, currentTimeChanged = function() {
        this.debug.log("[Stream] Current time has changed, block programmatic seek.");
        this.videoModel.unlisten("seeking", seekingListener);
        this.videoModel.listen("seeked", seekedListener);
    }, bufferingCompleted = function() {
        if (videoController && !videoController.isBufferingCompleted() || audioController && !audioController.isBufferingCompleted()) {
            return;
        }
        if (mediaSource) {
            this.debug.info("[Stream] Signal end of stream");
            this.mediaSourceExt.signalEndOfStream(mediaSource);
        }
    }, segmentLoadingFailed = function() {
        stopBuffering.call(this);
    }, onLiveEdgeFound = function(liveEdgeTime) {
        this.debug.info("[Stream] ### LiveEdge = " + liveEdgeTime);
        if (videoController) {
            videoController.seek(liveEdgeTime);
        }
        if (audioController) {
            audioController.seek(liveEdgeTime);
        }
        if (textController) {
            textController.seek(liveEdgeTime);
        }
    }, onBufferUpdated = function() {
        var self = this, videoRange, audioRange, startTime;
        self.debug.info("[Stream] Check start time");
        videoRange = self.sourceBufferExt.getBufferRange(videoController.getBuffer(), initialSeekTime, 2);
        if (videoRange === null) {
            return;
        }
        startTime = videoRange.start + .5;
        if (audioController) {
            audioRange = self.sourceBufferExt.getBufferRange(audioController.getBuffer(), initialSeekTime, 2);
            if (audioRange === null) {
                return;
            }
            self.debug.info("[Stream] Check start time: A[" + audioRange.start + "-" + audioRange.end + "], V[" + videoRange.start + "-" + videoRange.end + "]");
            if (audioRange.end < startTime) {
                return;
            }
        }
        self.debug.info("[Stream] Check start time: OK");
        self.system.unmapHandler("bufferUpdated");
        self.system.notify("setCurrentTime");
        self.videoModel.setCurrentTime(startTime);
        load.resolve(null);
    }, updateData = function(updatedPeriodInfo) {
        var self = this, videoData, audioData, textData, deferredVideoData, deferredAudioData, deferredTextData, deferred = Q.defer(), deferredVideoUpdate = Q.defer(), deferredAudioUpdate = Q.defer(), deferredTextUpdate = Q.defer(), deferredEventUpdate = Q.defer();
        manifest = self.manifestModel.getValue();
        periodInfo = updatedPeriodInfo;
        self.debug.log("Manifest updated... set new data on buffers.");
        if (videoController) {
            videoData = videoController.getData();
            if (!!videoData && videoData.hasOwnProperty("id")) {
                deferredVideoData = self.manifestExt.getDataForId(videoData.id, manifest, periodInfo.index);
            } else {
                deferredVideoData = self.manifestExt.getDataForIndex(videoTrackIndex, manifest, periodInfo.index);
            }
            deferredVideoData.then(function(data) {
                videoController.updateData(data, periodInfo).then(function() {
                    deferredVideoUpdate.resolve();
                });
            });
        } else {
            deferredVideoUpdate.resolve();
        }
        if (audioController) {
            audioData = audioController.getData();
            deferredAudioData = self.manifestExt.getDataForIndex(audioTrackIndex, manifest, periodInfo.index);
            deferredAudioData.then(function(data) {
                audioController.updateData(data, periodInfo).then(function() {
                    deferredAudioUpdate.resolve();
                });
            });
        } else {
            deferredAudioUpdate.resolve();
        }
        if (textController) {
            textData = textController.getData();
            deferredTextData = self.manifestExt.getDataForIndex(textTrackIndex, manifest, periodInfo.index);
            deferredTextData.then(function(data) {
                textController.updateData(data, periodInfo).then(function() {
                    deferredTextUpdate.resolve();
                });
            });
        }
        if (eventController) {
            self.manifestExt.getEventsForPeriod(manifest, periodInfo).then(function(events) {
                eventController.addInlineEvents(events);
                deferredEventUpdate.resolve();
            });
        }
        Q.when(deferredVideoUpdate.promise, deferredAudioUpdate.promise, deferredTextUpdate.promise).then(function() {
            deferred.resolve();
        });
        return deferred.promise;
    };
    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        bufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        protectionModel: undefined,
        protectionController: undefined,
        protectionExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsExt: undefined,
        errHandler: undefined,
        timelineConverter: undefined,
        requestScheduler: undefined,
        scheduleWhilePaused: undefined,
        metricsModel: undefined,
        eventBus: undefined,
        setup: function() {
            this.system.mapHandler("setCurrentTime", undefined, currentTimeChanged.bind(this));
            this.system.mapHandler("bufferingCompleted", undefined, bufferingCompleted.bind(this));
            this.system.mapHandler("segmentLoadingFailed", undefined, segmentLoadingFailed.bind(this));
            this.system.mapHandler("liveEdgeFound", undefined, onLiveEdgeFound.bind(this));
            load = Q.defer();
            playListener = onPlay.bind(this);
            pauseListener = onPause.bind(this);
            errorListener = onError.bind(this);
            seekingListener = onSeeking.bind(this);
            seekedListener = onSeeked.bind(this);
            progressListener = onProgress.bind(this);
            ratechangeListener = onRatechange.bind(this);
            timeupdateListener = onTimeupdate.bind(this);
            durationchangeListener = onDurationchange.bind(this);
            loadedListener = onLoad.bind(this);
            canplayListener = onCanPlay.bind(this);
            playingListener = onPlaying.bind(this);
            loadstartListener = onLoadStart.bind(this);
            waitingListener = onWaiting.bind(this);
            fullScreenListener = onFullScreenChange.bind(this);
            endedListener = onEnded.bind(this);
        },
        load: function(manifest, periodInfoValue) {
            periodInfo = periodInfoValue;
            doLoad.call(this, manifest);
        },
        setVideoModel: function(value) {
            this.videoModel = value;
            this.videoModel.listen("play", playListener);
            this.videoModel.listen("pause", pauseListener);
            this.videoModel.listen("error", errorListener);
            this.videoModel.listen("seeking", seekingListener);
            this.videoModel.listen("timeupdate", timeupdateListener);
            this.videoModel.listen("durationchange", durationchangeListener);
            this.videoModel.listen("progress", progressListener);
            this.videoModel.listen("ratechange", ratechangeListener);
            this.videoModel.listen("loadedmetadata", loadedListener);
            this.videoModel.listen("ended", endedListener);
            this.videoModel.listen("canplay", canplayListener);
            this.videoModel.listen("playing", playingListener);
            this.videoModel.listen("loadstart", loadstartListener);
            this.videoModel.listen("webkitfullscreenchange", fullScreenListener);
            this.videoModel.listen("fullscreenchange", fullScreenListener);
            this.videoModel.listenOnParent("fullscreenchange", fullScreenListener);
            this.videoModel.listenOnParent("webkitfullscreenchange", fullScreenListener);
            this.requestScheduler.videoModel = value;
        },
        setAudioTrack: function(audioTrack) {
            var deferredAudioUpdate = Q.defer(), manifest = this.manifestModel.getValue(), url, self = this;
            if (audioController) {
                self.manifestExt.getDataIndex(audioTrack, manifest, periodInfo.index).then(function(index) {
                    audioTrackIndex = index;
                    url = manifest.mpdUrl;
                    if (manifest.hasOwnProperty("Location")) {
                        url = manifest.Location;
                    }
                    self.debug.log("### Refresh manifest @ " + url);
                    self.manifestLoader.load(url).then(function(manifestResult) {
                        self.manifestModel.setValue(manifestResult);
                        self.debug.log("### Manifest has been refreshed.");
                        deferredAudioUpdate.resolve();
                    });
                });
            } else {
                deferredAudioUpdate.reject();
            }
            return deferredAudioUpdate.promise;
        },
        setSubtitleTrack: function(subtitleTrack) {
            var deferredSubtitleUpdate = Q.defer(), manifest = this.manifestModel.getValue(), url, self = this;
            if (textController) {
                self.manifestExt.getDataIndex(subtitleTrack, manifest, periodInfo.index).then(function(index) {
                    textTrackIndex = index;
                    url = manifest.mpdUrl;
                    if (manifest.hasOwnProperty("Location")) {
                        url = manifest.Location;
                    }
                    self.debug.log("### Refresh manifest @ " + url);
                    self.manifestLoader.load(url).then(function(manifestResult) {
                        self.manifestModel.setValue(manifestResult);
                        self.debug.log("### Manifest has been refreshed.");
                        deferredSubtitleUpdate.resolve();
                    });
                });
            } else {
                deferredSubtitleUpdate.reject();
            }
            return deferredSubtitleUpdate.promise;
        },
        initProtection: function() {
            needKeyListener = onMediaSourceNeedsKey.bind(this);
            keyMessageListener = onMediaSourceKeyMessage.bind(this);
            keyAddedListener = onMediaSourceKeyAdded.bind(this);
            keyErrorListener = onMediaSourceKeyError.bind(this);
            this.protectionModel = this.system.getObject("protectionModel");
            this.protectionModel.init(this.getVideoModel());
            this.protectionController = this.system.getObject("protectionController");
            this.protectionController.init(this.manifestModel.getValue());
            this.protectionController.setMediaElement(this.getVideoModel().getElement());
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        getManifestExt: function() {
            var self = this;
            return self.manifestExt;
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        reset: function() {
            this.debug.info("[Stream] Reset");
            pause.call(this);
            this.videoModel.unlisten("play", playListener);
            this.videoModel.unlisten("pause", pauseListener);
            this.videoModel.unlisten("error", errorListener);
            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.unlisten("timeupdate", timeupdateListener);
            this.videoModel.unlisten("durationchange", durationchangeListener);
            this.videoModel.unlisten("progress", progressListener);
            this.videoModel.unlisten("ratechange", ratechangeListener);
            this.videoModel.unlisten("loadedmetadata", loadedListener);
            this.videoModel.unlisten("ended", endedListener);
            this.videoModel.unlisten("canplay", canplayListener);
            this.videoModel.unlisten("playing", playingListener);
            this.videoModel.unlisten("loadstart", loadstartListener);
            this.videoModel.unlisten("webkitfullscreenchange", fullScreenListener);
            this.videoModel.unlisten("fullscreenchange", fullScreenListener);
            this.videoModel.unlistenOnParent("fullscreenchange", fullScreenListener);
            this.videoModel.unlistenOnParent("webkitfullscreenchange", fullScreenListener);
            tearDownMediaSource.call(this);
            if (!!this.protectionController) {
                this.protectionController.teardownKeySystem(kid);
            }
            this.protectionController = undefined;
            this.protectionModel = undefined;
            this.fragmentController = undefined;
            this.requestScheduler = undefined;
            load = Q.defer();
        },
        getDuration: function() {
            return periodInfo.duration;
        },
        getStartTime: function() {
            return periodInfo.start;
        },
        getPeriodIndex: function() {
            return periodInfo.index;
        },
        getId: function() {
            return periodInfo.id;
        },
        getPeriodInfo: function() {
            return periodInfo;
        },
        startEventController: function() {
            eventController.start();
        },
        resetEventController: function() {
            eventController.reset();
        },
        updateData: updateData,
        play: play,
        seek: seek,
        pause: pause
    };
};

MediaPlayer.dependencies.Stream.prototype = {
    constructor: MediaPlayer.dependencies.Stream
};

MediaPlayer.dependencies.StreamController = function() {
    "use strict";
    var streams = [], activeStream, STREAM_BUFFER_END_THRESHOLD = 6, STREAM_END_THRESHOLD = .2, autoPlay = true, isPeriodSwitchingInProgress = false, timeupdateListener, seekingListener, progressListener, pauseListener, playListener, audioTracks, subtitleTracks, play = function() {
        activeStream.play();
    }, pause = function() {
        activeStream.pause();
    }, seek = function(time) {
        activeStream.seek(time);
    }, switchVideoModel = function(fromVideoModel, toVideoModel) {
        var activeVideoElement = fromVideoModel.getElement(), newVideoElement = toVideoModel.getElement();
        if (!newVideoElement.parentNode) {
            activeVideoElement.parentNode.insertBefore(newVideoElement, activeVideoElement);
        }
        activeVideoElement.style.width = "0px";
        newVideoElement.style.width = "100%";
        copyVideoProperties(activeVideoElement, newVideoElement);
        detachVideoEvents.call(this, fromVideoModel);
        attachVideoEvents.call(this, toVideoModel);
        return Q.when(true);
    }, attachVideoEvents = function(videoModel) {
        videoModel.listen("seeking", seekingListener);
        videoModel.listen("progress", progressListener);
        videoModel.listen("timeupdate", timeupdateListener);
        videoModel.listen("pause", pauseListener);
        videoModel.listen("play", playListener);
    }, detachVideoEvents = function(videoModel) {
        videoModel.unlisten("seeking", seekingListener);
        videoModel.unlisten("progress", progressListener);
        videoModel.unlisten("timeupdate", timeupdateListener);
        videoModel.unlisten("pause", pauseListener);
        videoModel.unlisten("play", playListener);
    }, copyVideoProperties = function(fromVideoElement, toVideoElement) {
        [ "controls", "loop", "muted", "playbackRate", "volume" ].forEach(function(prop) {
            toVideoElement[prop] = fromVideoElement[prop];
        });
    }, onProgress = function() {
        var ranges = activeStream.getVideoModel().getElement().buffered;
        if (!ranges.length) {
            return;
        }
        var lastRange = ranges.length - 1, bufferEndTime = ranges.end(lastRange), remainingBufferDuration = activeStream.getStartTime() + activeStream.getDuration() - bufferEndTime;
        if (remainingBufferDuration < STREAM_BUFFER_END_THRESHOLD) {
            activeStream.getVideoModel().unlisten("progress", progressListener);
            onStreamBufferingEnd();
        }
    }, onReloadManifest = function() {
        this.debug.log("[StreamController] ### reloadManifest ####");
        this.reset.call(this);
        this.load.call(this, this.currentURL, this.currentParams);
    }, onTimeupdate = function() {
        var streamEndTime = activeStream.getStartTime() + activeStream.getDuration(), currentTime = activeStream.getVideoModel().getCurrentTime(), self = this, videoElement = activeStream.getVideoModel().getElement(), playBackQuality = self.videoExt.getPlaybackQuality(videoElement), elapsedTime = (new Date().getTime() - self.startPlayingTime) / 1e3;
        self.metricsModel.addCondition(null, null, videoElement.videoWidth, videoElement.videoHeight, playBackQuality.droppedVideoFrames, playBackQuality.totalVideoFrames / elapsedTime);
        if (!getNextStream()) return;
        if (activeStream.getVideoModel().getElement().seeking) return;
        if (streamEndTime - currentTime < STREAM_END_THRESHOLD) {
            switchStream.call(this, activeStream, getNextStream());
        }
    }, onSeeking = function() {
        var seekingTime = activeStream.getVideoModel().getCurrentTime(), seekingStream = getStreamForTime(seekingTime);
        this.metricsModel.addState("video", "seeking", activeStream.getVideoModel().getCurrentTime());
        if (seekingStream && seekingStream !== activeStream) {
            switchStream.call(this, activeStream, seekingStream, seekingTime);
        }
    }, onPause = function() {
        this.manifestUpdater.stop();
        this.metricsModel.addState("video", "paused", activeStream.getVideoModel().getCurrentTime());
    }, onPlay = function() {
        this.manifestUpdater.start();
        if (this.startPlayingTime === undefined) {
            this.startPlayingTime = new Date().getTime();
        }
        var videoElement = activeStream.getVideoModel().getElement();
        this.metricsModel.addCondition(null, 0, videoElement.videoWidth, videoElement.videoHeight);
    }, onStreamBufferingEnd = function() {
        var nextStream = getNextStream();
        if (nextStream) {
            nextStream.seek(nextStream.getStartTime());
        }
    }, getNextStream = function() {
        var nextIndex = activeStream.getPeriodIndex() + 1;
        return nextIndex < streams.length ? streams[nextIndex] : null;
    }, getStreamForTime = function(time) {
        var duration = 0, stream = null, ln = streams.length;
        if (ln > 0) {
            duration += streams[0].getStartTime();
        }
        for (var i = 0; i < ln; i++) {
            stream = streams[i];
            duration += stream.getDuration();
            if (time < duration) {
                return stream;
            }
        }
    }, createVideoModel = function() {
        var model = this.system.getObject("videoModel"), video = document.createElement("video");
        model.setElement(video);
        return model;
    }, removeVideoElement = function(element) {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }, switchStream = function(from, to, seekTo) {
        if (isPeriodSwitchingInProgress || !from || !to || from === to) return;
        isPeriodSwitchingInProgress = true;
        from.pause();
        activeStream = to;
        switchVideoModel.call(this, from.getVideoModel(), to.getVideoModel());
        if (seekTo) {
            seek(from.getVideoModel().getCurrentTime());
        } else {
            seek(to.getStartTime());
        }
        play();
        from.resetEventController();
        activeStream.startEventController();
        isPeriodSwitchingInProgress = false;
    }, composeStreams = function() {
        var self = this, manifest = self.manifestModel.getValue(), metrics = self.metricsModel.getMetricsFor("stream"), manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics), periodInfo, deferred = Q.defer(), updatedStreams = [], pLen, sLen, pIdx, sIdx, period, stream;
        self.startPlayingTime = undefined;
        if (!manifest) {
            return Q.when(false);
        }
        self.manifestExt.getMpd(manifest).then(function(mpd) {
            if (activeStream) {
                periodInfo = activeStream.getPeriodInfo();
                mpd.isClientServerTimeSyncCompleted = periodInfo.mpd.isClientServerTimeSyncCompleted;
                mpd.clientServerTimeShift = periodInfo.mpd.clientServerTimeShift;
            }
            self.manifestExt.getRegularPeriods(manifest, mpd).then(function(periods) {
                if (periods.length === 0) {
                    return deferred.reject("There are no regular periods");
                }
                self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                    currentTime: self.videoModel.getCurrentTime(),
                    buffered: self.videoModel.getElement().buffered,
                    presentationStartTime: periods[0].start,
                    clientTimeOffset: mpd.clientServerTimeShift
                });
                for (pIdx = 0, pLen = periods.length; pIdx < pLen; pIdx += 1) {
                    period = periods[pIdx];
                    for (sIdx = 0, sLen = streams.length; sIdx < sLen; sIdx += 1) {
                        if (streams[sIdx].getId() === period.id) {
                            stream = streams[sIdx];
                            updatedStreams.push(stream.updateData(period));
                        }
                    }
                    if (!stream) {
                        stream = self.system.getObject("stream");
                        stream.setVideoModel(pIdx === 0 ? self.videoModel : createVideoModel.call(self));
                        stream.initProtection();
                        stream.setAutoPlay(autoPlay);
                        stream.load(manifest, period);
                        streams.push(stream);
                    }
                    self.metricsModel.addManifestUpdatePeriodInfo(manifestUpdateInfo, period.id, period.index, period.start, period.duration);
                    stream = null;
                }
                if (!activeStream) {
                    activeStream = streams[0];
                    attachVideoEvents.call(self, activeStream.getVideoModel());
                }
                Q.all(updatedStreams).then(function() {
                    deferred.resolve();
                });
            });
        });
        return deferred.promise;
    }, updateAudioTracks = function() {
        if (activeStream) {
            var self = this;
            self.manifestExt.getAudioDatas(self.manifestModel.getValue(), activeStream.getPeriodIndex()).then(function(audiosDatas) {
                audioTracks = audiosDatas;
                self.system.notify("audioTracksUpdated");
            });
        }
    }, updateSubtitleTracks = function() {
        if (activeStream) {
            var self = this;
            self.manifestExt.getTextDatas(self.manifestModel.getValue(), activeStream.getPeriodIndex()).then(function(textDatas) {
                subtitleTracks = textDatas;
                self.system.notify("subtitleTracksUpdated");
            });
        }
    }, manifestHasUpdated = function() {
        var self = this;
        composeStreams.call(self).then(function() {
            updateAudioTracks.call(self);
            updateSubtitleTracks.call(self);
            self.system.notify("streamsComposed");
        }, function(errMsg) {
            self.errHandler.manifestError(errMsg, "nostreamscomposed", self.manifestModel.getValue());
            self.reset();
        });
    };
    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestUpdater: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        bufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        videoExt: undefined,
        errHandler: undefined,
        startTime: undefined,
        startPlayingTime: undefined,
        currentURL: undefined,
        currentParams: undefined,
        setup: function() {
            this.system.mapHandler("manifestUpdated", undefined, manifestHasUpdated.bind(this));
            timeupdateListener = onTimeupdate.bind(this);
            progressListener = onProgress.bind(this);
            seekingListener = onSeeking.bind(this);
            pauseListener = onPause.bind(this);
            playListener = onPlay.bind(this);
            this.system.mapHandler("reloadManifest", undefined, onReloadManifest.bind(this));
        },
        getManifestExt: function() {
            return activeStream.getManifestExt();
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        getAudioTracks: function() {
            return audioTracks;
        },
        setAudioTrack: function(audioTrack) {
            if (activeStream) {
                activeStream.setAudioTrack(audioTrack);
            }
        },
        getSubtitleTracks: function() {
            return subtitleTracks;
        },
        setSubtitleTrack: function(subtitleTrack) {
            if (activeStream) {
                activeStream.setSubtitleTrack(subtitleTrack);
            }
        },
        load: function(url, params) {
            var self = this;
            self.currentURL = url;
            self.currentParams = params;
            self.debug.info("[StreamController] load url: " + url);
            self.manifestLoader.load(url).then(function(manifest) {
                if (params) {
                    if (params.backUrl) {
                        manifest.backUrl = params.backUrl;
                    }
                    if (params.customData) {
                        manifest.customData = params.customData;
                    }
                }
                self.manifestModel.setValue(manifest);
                self.metricsModel.addMetaData();
                self.debug.info("[StreamController] Manifest has loaded.");
                self.manifestUpdater.start();
            }, function() {
                self.reset();
            });
        },
        reset: function() {
            this.debug.info("[StreamController] Reset");
            if (!!activeStream) {
                detachVideoEvents.call(this, activeStream.getVideoModel());
            }
            for (var i = 0, ln = streams.length; i < ln; i++) {
                var stream = streams[i];
                stream.reset();
                if (stream !== activeStream) {
                    removeVideoElement(stream.getVideoModel().getElement());
                }
            }
            streams = [];
            this.manifestUpdater.stop();
            this.manifestModel.setValue(null);
            this.metricsModel.clearAllCurrentMetrics();
            isPeriodSwitchingInProgress = false;
            activeStream = null;
        },
        play: play,
        seek: seek,
        pause: pause
    };
};

MediaPlayer.dependencies.StreamController.prototype = {
    constructor: MediaPlayer.dependencies.StreamController
};

MediaPlayer.utils.TokenAuthentication = function() {
    "use strict";
    var tokenAuthentication = {
        type: MediaPlayer.utils.TokenAuthentication.TYPE_QUERY
    };
    return {
        debug: undefined,
        getTokenAuthentication: function() {
            return tokenAuthentication;
        },
        setTokenAuthentication: function(object) {
            tokenAuthentication = object;
        },
        checkRequestHeaderForToken: function(request) {
            if (tokenAuthentication.name !== undefined && request.getResponseHeader(tokenAuthentication.name) !== null) {
                tokenAuthentication.token = request.getResponseHeader(tokenAuthentication.name);
                this.debug.log(tokenAuthentication.name + " received: " + tokenAuthentication.token);
            }
        },
        addTokenAsQueryArg: function(url) {
            if (tokenAuthentication.name !== undefined && tokenAuthentication.token !== undefined) {
                if (tokenAuthentication.type === MediaPlayer.utils.TokenAuthentication.TYPE_QUERY) {
                    var modifier = url.indexOf("?") === -1 ? "?" : "&";
                    url += modifier + tokenAuthentication.name + "=" + tokenAuthentication.token;
                    this.debug.log(tokenAuthentication.name + " is being appended on the request url with a value of : " + tokenAuthentication.token);
                }
            }
            return url;
        },
        setTokenInRequestHeader: function(request) {
            if (tokenAuthentication.type === MediaPlayer.utils.TokenAuthentication.TYPE_HEADER) {
                request.setRequestHeader(tokenAuthentication.name, tokenAuthentication.token);
                this.debug.log(tokenAuthentication.name + " is being set in the request header with a value of : " + tokenAuthentication.token);
            }
            return request;
        }
    };
};

MediaPlayer.utils.TokenAuthentication.TYPE_QUERY = "query";

MediaPlayer.utils.TokenAuthentication.TYPE_HEADER = "header";

MediaPlayer.models.URIQueryAndFragmentModel = function() {
    "use strict";
    var URIFragmentDataVO = new MediaPlayer.vo.URIFragmentData(), URIQueryData = [], reset = function() {
        URIFragmentDataVO = new MediaPlayer.vo.URIFragmentData();
        URIQueryData = [];
    }, parseURI = function(uri) {
        var URIFragmentData = [], testQuery = new RegExp(/[?]/), testFragment = new RegExp(/[#]/), isQuery = testQuery.test(uri), isFragment = testFragment.test(uri), mappedArr;
        function reduceArray(previousValue, currentValue, index, array) {
            var arr = array[0].split(/[=]/);
            array.push({
                key: arr[0],
                value: arr[1]
            });
            array.shift();
            return array;
        }
        function mapArray(currentValue, index, array) {
            if (index > 0) {
                if (isQuery && URIQueryData.length === 0) {
                    URIQueryData = array[index].split(/[&]/);
                } else if (isFragment) {
                    URIFragmentData = array[index].split(/[&]/);
                }
            }
            return array;
        }
        mappedArr = uri.split(/[?#]/).map(mapArray);
        if (URIQueryData.length > 0) {
            URIQueryData = URIQueryData.reduce(reduceArray, null);
        }
        if (URIFragmentData.length > 0) {
            URIFragmentData = URIFragmentData.reduce(reduceArray, null);
            URIFragmentData.forEach(function(object) {
                URIFragmentDataVO[object.key] = object.value;
            });
        }
        return uri;
    };
    return {
        parseURI: parseURI,
        reset: reset,
        getURIFragmentData: function() {
            return URIFragmentDataVO;
        },
        getURIQueryData: URIQueryData
    };
};

MediaPlayer.models.URIQueryAndFragmentModel.prototype = {
    constructor: MediaPlayer.models.URIQueryAndFragmentModel
};

MediaPlayer.models.VideoModel = function() {
    "use strict";
    var element, stalledStreams = [], isStalled = function() {
        return stalledStreams.length > 0;
    }, addStalledStream = function(type) {
        if (type === null) {
            return;
        }
        element.playbackRate = 0;
        if (stalledStreams[type] === true) {
            return;
        }
        stalledStreams.push(type);
        stalledStreams[type] = true;
    }, removeStalledStream = function(type) {
        if (type === null) {
            return;
        }
        stalledStreams[type] = false;
        var index = stalledStreams.indexOf(type);
        if (index !== -1) {
            stalledStreams.splice(index, 1);
        }
        if (isStalled() === false) {
            element.playbackRate = 1;
        }
    }, stallStream = function(type, isStalled) {
        if (isStalled) {
            addStalledStream(type);
        } else {
            removeStalledStream(type);
        }
    };
    return {
        system: undefined,
        setup: function() {},
        play: function() {
            element.play();
        },
        pause: function() {
            element.pause();
        },
        isPaused: function() {
            return element.paused;
        },
        isSeeking: function() {
            return element.seeking;
        },
        getPlaybackRate: function() {
            return element.playbackRate;
        },
        setPlaybackRate: function(value) {
            element.playbackRate = value;
        },
        getCurrentTime: function() {
            return element.currentTime;
        },
        setCurrentTime: function(currentTime) {
            if (element.currentTime == currentTime) return;
            element.currentTime = currentTime;
        },
        listen: function(type, callback) {
            element.addEventListener(type, callback, false);
        },
        unlisten: function(type, callback) {
            element.removeEventListener(type, callback, false);
        },
        listenOnParent: function(type, callback) {
            element.parentElement.addEventListener(type, callback, false);
        },
        unlistenOnParent: function(type, callback) {
            element.parentElement.removeEventListener(type, callback, false);
        },
        getElement: function() {
            return element;
        },
        setElement: function(value) {
            element = value;
        },
        setSource: function(source) {
            element.src = source;
        },
        isStalled: function() {
            return element.playbackRate === 0;
        },
        stallStream: stallStream
    };
};

MediaPlayer.models.VideoModel.prototype = {
    constructor: MediaPlayer.models.VideoModel
};

MediaPlayer.dependencies.VideoModelExtensions = function() {
    "use strict";
    return {
        getPlaybackQuality: function(videoElement) {
            var hasWebKit = "webkitDroppedFrameCount" in videoElement, hasQuality = "getVideoPlaybackQuality" in videoElement, result = null;
            if (hasQuality) {
                result = videoElement.getVideoPlaybackQuality();
            } else if (hasWebKit) {
                result = {
                    droppedVideoFrames: videoElement.webkitDroppedFrameCount,
                    creationTime: new Date(),
                    totalVideoFrames: videoElement.webkitDecodedFrameCount
                };
            }
            return result;
        }
    };
};

MediaPlayer.dependencies.VideoModelExtensions.prototype = {
    constructor: MediaPlayer.dependencies.VideoModelExtensions
};

MediaPlayer.utils.TTMLParser = function() {
    "use strict";
    var SECONDS_IN_HOUR = 60 * 60, SECONDS_IN_MIN = 60, timingRegexClockTime = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])((\.[0-9][0-9][0-9])|(:[0-9][0-9]))$/, timingRegexOffsetTime = /^\d+(\.\d+|)(h|m|s|ms|f)$/, ttml, parseTimings = function(timingStr) {
        var timeParts, parsedTime, frameRate, metric;
        if (timingRegexClockTime.test(timingStr)) {
            timeParts = timingStr.split(":");
            parsedTime = parseFloat(timeParts[0]) * SECONDS_IN_HOUR + parseFloat(timeParts[1]) * SECONDS_IN_MIN + parseFloat(timeParts[2]);
            if (timeParts[3]) {
                frameRate = ttml.tt.frameRate;
                if (frameRate && !isNaN(frameRate)) {
                    parsedTime += parseFloat(timeParts[3]) / frameRate;
                }
            }
            return parsedTime;
        }
        if (timingRegexOffsetTime.test(timingStr)) {
            if (timingStr.substr(timingStr.length - 2) == "ms") {
                parsedTime = parseFloat(timingStr.substr(0, timingStr.length - 3));
                metric = timingStr.substr(timingStr.length - 2);
            } else {
                parsedTime = parseFloat(timingStr.substr(0, timingStr.length - 2));
                metric = timingStr.substr(timingStr.length - 1);
            }
            switch (metric) {
              case "h":
                parsedTime = parsedTime * 60 * 60;
                break;

              case "m":
                parsedTime = parsedTime * 60;
                break;

              case "s":
                break;

              case "ms":
                parsedTime = parsedTime * .01;
                break;

              case "f":
                frameRate = ttml.tt.frameRate;
                if (frameRate && !isNaN(frameRate)) {
                    parsedTime = parsedTime / frameRate;
                } else {
                    return NaN;
                }
                break;
            }
            return parsedTime;
        }
        return NaN;
    }, passStructuralConstraints = function() {
        var passed = false, hasTt = ttml.hasOwnProperty("tt"), hasHead = hasTt ? ttml.tt.hasOwnProperty("head") : false, hasLayout = hasHead ? ttml.tt.head.hasOwnProperty("layout") : false, hasStyling = hasHead ? ttml.tt.head.hasOwnProperty("styling") : false, hasBody = hasTt ? ttml.tt.hasOwnProperty("body") : false;
        if (hasTt && hasHead && hasLayout && hasStyling && hasBody) {
            passed = true;
        }
        return passed;
    }, getNamespacePrefix = function(json, ns) {
        var r = Object.keys(json).filter(function(k) {
            return k.split(":")[0] === "xmlns" && json[k] === ns;
        }).map(function(k) {
            return k.split(":")[1];
        });
        if (r.length != 1) {
            return "";
        }
        return r[0] + ":";
    }, internalParse = function(data) {
        var captionArray = [], converter = new X2JS([], "", false), errorMsg, cues, cue, startTime, endTime, nsttp, nscue, i;
        try {
            ttml = converter.xml_str2json(data);
            if (!passStructuralConstraints()) {
                errorMsg = "TTML document has incorrect structure";
                return Q.reject(errorMsg);
            }
            nsttp = getNamespacePrefix(ttml.tt, "http://www.w3.org/ns/ttml#parameter");
            if (ttml.tt.hasOwnProperty(nsttp + "frameRate")) {
                ttml.tt.frameRate = parseInt(ttml.tt[nsttp + "frameRate"], 10);
            }
            cues = ttml.tt.body.div_asArray[0].p_asArray;
            if (!cues || cues.length === 0) {
                errorMsg = "TTML document does not contain any cues";
                return Q.reject(errorMsg);
            }
            for (i = 0; i < cues.length; i += 1) {
                cue = cues[i];
                nscue = getNamespacePrefix(cue, "http://www.w3.org/2006/10/ttaf1");
                startTime = parseTimings(cue[nscue + "begin"]);
                endTime = parseTimings(cue[nscue + "end"]);
                if (isNaN(startTime) || isNaN(endTime)) {
                    errorMsg = "TTML document has incorrect timing value";
                    return Q.reject(errorMsg);
                }
                captionArray.push({
                    start: startTime,
                    end: endTime,
                    data: cue.__text
                });
            }
            return Q.when(captionArray);
        } catch (err) {
            errorMsg = err.message;
            return Q.reject(errorMsg);
        }
    };
    return {
        parse: internalParse
    };
};

MediaPlayer.dependencies.TextController = function() {
    var LOADING = "LOADING", READY = "READY", initialized = false, periodInfo = null, mediaSource, data, buffer, availableRepresentations, state = READY, setState = function(value) {
        this.debug.log("TextController setState to:" + value);
        state = value;
    }, startPlayback = function() {
        if (!initialized || state !== READY) {
            return;
        }
        var self = this;
        self.indexHandler.getInitRequest(availableRepresentations[0]).then(function(request) {
            self.fragmentLoader.load(request).then(onBytesLoaded.bind(self, request), onBytesError.bind(self, request));
            setState.call(self, LOADING);
        });
    }, doStart = function() {
        startPlayback.call(this);
    }, updateRepresentations = function(data, periodInfo) {
        var self = this, deferred = Q.defer(), manifest = self.manifestModel.getValue();
        self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(function(idx) {
            self.manifestExt.getAdaptationsForPeriod(manifest, periodInfo).then(function(adaptations) {
                self.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[idx]).then(function(representations) {
                    deferred.resolve(representations);
                });
            });
        });
        return deferred.promise;
    }, onBytesLoaded = function(request, response) {
        var self = this;
        self.fragmentController.process(response.data, request).then(function(data) {
            if (data !== null) {
                self.sourceBufferExt.append(buffer, data, self.videoModel);
            }
        });
    }, onBytesError = function() {};
    return {
        videoModel: undefined,
        fragmentLoader: undefined,
        fragmentController: undefined,
        indexHandler: undefined,
        sourceBufferExt: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        debug: undefined,
        initialize: function(periodInfo, data, buffer, videoModel, source) {
            var self = this;
            self.setVideoModel(videoModel);
            self.setBuffer(buffer);
            self.setMediaSource(source);
            self.updateData(data, periodInfo).then(function() {
                initialized = true;
                startPlayback.call(self);
            });
        },
        setPeriodInfo: function(value) {
            periodInfo = value;
        },
        getPeriodIndex: function() {
            return periodInfo.index;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        getData: function() {
            return data;
        },
        setData: function(value) {
            data = value;
        },
        getBuffer: function() {
            return buffer;
        },
        setBuffer: function(value) {
            buffer = value;
        },
        setMediaSource: function(value) {
            mediaSource = value;
        },
        updateData: function(dataValue, periodInfoValue) {
            var self = this, deferred = Q.defer();
            data = dataValue;
            periodInfo = periodInfoValue;
            updateRepresentations.call(self, data, periodInfo).then(function(representations) {
                availableRepresentations = representations;
                setState.call(self, READY);
                startPlayback.call(self);
                deferred.resolve();
            });
            return deferred.promise;
        },
        reset: function(errored) {
            if (!errored) {
                this.sourceBufferExt.abort(mediaSource, buffer);
                this.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }
        },
        start: doStart
    };
};

MediaPlayer.dependencies.TextController.prototype = {
    constructor: MediaPlayer.dependencies.TextController
};

MediaPlayer.dependencies.TextSourceBuffer = function() {
    var video, data, mimeType;
    return {
        system: undefined,
        eventBus: undefined,
        errHandler: undefined,
        initialize: function(type, bufferController) {
            mimeType = type;
            video = bufferController.getVideoModel().getElement();
            data = bufferController.getData();
        },
        append: function(bytes) {
            var self = this, ccContent = String.fromCharCode.apply(null, new Uint16Array(bytes));
            self.getParser().parse(ccContent).then(function(result) {
                var label = data.Representation_asArray[0].id, lang = data.lang;
                self.getTextTrackExtensions().addTextTrack(video, result, label, lang, true).then(function() {
                    self.eventBus.dispatchEvent({
                        type: "updateend"
                    });
                });
            }, function(errMsg) {
                self.errHandler.closedCaptionsError(errMsg, "parse", ccContent);
            });
        },
        abort: function() {
            this.getTextTrackExtensions().deleteCues(video);
        },
        getParser: function() {
            var parser;
            if (mimeType === "text/vtt") {
                parser = this.system.getObject("vttParser");
            } else if (mimeType === "application/ttml+xml") {
                parser = this.system.getObject("ttmlParser");
            }
            return parser;
        },
        getTextTrackExtensions: function() {
            return this.system.getObject("textTrackExtensions");
        },
        addEventListener: function(type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
        },
        removeEventListener: function(type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        }
    };
};

MediaPlayer.dependencies.TextSourceBuffer.prototype = {
    constructor: MediaPlayer.dependencies.TextSourceBuffer
};

MediaPlayer.dependencies.TextTTMLXMLMP4SourceBuffer = function() {
    var video, mimeType, currentLang, currentId, buffered = {
        length: 0,
        ranges: [],
        start: function(index) {
            return this.ranges[index].start;
        },
        end: function(index) {
            return this.ranges[index].end;
        },
        addRange: function(start, end) {
            this.ranges.push({
                start: start,
                end: end
            });
            this.length = this.length + 1;
            this.ranges.sort(function(a, b) {
                return a.start - b.start;
            });
        },
        reset: function() {
            this.length = 0;
            this.ranges = [];
        }
    };
    return {
        updating: false,
        system: undefined,
        eventBus: undefined,
        buffered: buffered,
        textTrackExtensions: undefined,
        ttmlParser: undefined,
        initialize: function(type, bufferController, subtitleData) {
            mimeType = type;
            video = bufferController.getVideoModel().getElement();
            buffered.reset();
            currentLang = subtitleData.lang;
            currentId = subtitleData.id;
        },
        remove: function(start, end) {
            if (start < 0 || start >= end) {
                throw "INVALID_ACCESS_ERR";
            }
            this.abort();
        },
        append: function(bytes) {
            var self = this;
            var file = mp4lib.deserialize(bytes);
            var moov = file.getBoxByType("moov");
            if (moov) {
                var mvhd = moov.getBoxByType("mvhd");
                self.timescale = mvhd.timescale;
                self.textTrackExtensions.addTextTrack(video, [], currentId, currentLang, true).then(function(track) {
                    self.track = track;
                    self.eventBus.dispatchEvent({
                        type: "updateend"
                    });
                });
                return;
            }
            var moof = file.getBoxByType("moof");
            if (moof) {
                var mdat = file.getBoxByType("mdat");
                var traf = moof.getBoxByType("traf");
                var tfhd = traf.getBoxByType("tfhd");
                var tfdt = traf.getBoxByType("tfdt");
                var trun = traf.getBoxByType("trun");
                var fragmentStart = tfdt.baseMediaDecodeTime / self.timescale;
                var fragmentDuration = 0;
                if (trun.flags & 256) {
                    fragmentDuration = trun.samples_table[0].sample_duration / self.timescale;
                } else {
                    fragmentDuration = tfhd.default_sample_duration / self.timescale;
                }
                self.buffered.addRange(fragmentStart, fragmentStart + fragmentDuration);
                self.convertUTF8ToString(mdat.data).then(function(result) {
                    self.ttmlParser.parse(result).then(function(cues) {
                        var i;
                        if (cues) {
                            for (i = 0; i < cues.length; i++) {
                                cues[i].start = cues[i].start + fragmentStart;
                                cues[i].end = cues[i].end + fragmentStart;
                            }
                            self.textTrackExtensions.addCues(self.track, cues);
                            self.eventBus.dispatchEvent({
                                type: "updateend"
                            });
                        }
                    });
                });
            }
            return;
        },
        convertUTF8ToString: function(buf) {
            var deferred = Q.defer();
            var blob = new Blob([ buf ], {
                type: "text/xml"
            });
            var f = new FileReader();
            f.onload = function(e) {
                deferred.resolve(e.target.result);
            };
            f.readAsText(blob);
            return deferred.promise;
        },
        abort: function() {
            this.getTextTrackExtensions().deleteCues(video);
        },
        getTextTrackExtensions: function() {
            return this.textTrackExtensions;
        },
        addEventListener: function(type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
            if (!this.updating) this.eventBus.dispatchEvent({
                type: "updateend"
            });
        },
        removeEventListener: function(type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        }
    };
};

MediaPlayer.dependencies.TextTTMLXMLMP4SourceBuffer.prototype = {
    constructor: MediaPlayer.dependencies.TextTTMLXMLMP4SourceBuffer
};

MediaPlayer.utils.TextTrackExtensions = function() {
    "use strict";
    var Cue;
    return {
        setup: function() {
            Cue = window.VTTCue || window.TextTrackCue;
        },
        addTextTrack: function(video, captionData, label, scrlang, isDefaultTrack) {
            var track = null;
            if (video.textTracks.length === 0) {
                track = video.addTextTrack("captions", label, scrlang);
            } else {
                track = video.textTracks[0];
            }
            track.default = isDefaultTrack;
            track.mode = "showing";
            for (var item in captionData) {
                var currentItem = captionData[item];
                track.addCue(new Cue(currentItem.start, currentItem.end, currentItem.data));
            }
            return Q.when(track);
        },
        addCues: function(track, captionData) {
            for (var item in captionData) {
                var currentItem = captionData[item];
                track.addCue(new Cue(currentItem.start, currentItem.end, currentItem.data));
            }
        },
        deleteCues: function(video) {
            if (video) {
                var track = video.textTracks[0];
                if (track) {
                    var cues = track.cues;
                    if (cues) {
                        var lastIdx = cues.length - 1;
                        for (var i = lastIdx; i >= 0; i -= 1) {
                            track.removeCue(cues[i]);
                        }
                    }
                }
            }
        }
    };
};

MediaPlayer.utils.VTTParser = function() {
    "use strict";
    var convertCuePointTimes = function(time) {
        var timeArray = time.split(":"), len = timeArray.length - 1;
        time = parseInt(timeArray[len - 1], 10) * 60 + parseFloat(timeArray[len], 10);
        if (len === 2) {
            time += parseInt(timeArray[0], 10) * 3600;
        }
        return time;
    };
    return {
        parse: function(data) {
            var regExNewLine = /(?:\r\n|\r|\n)/gm, regExToken = /-->/, regExWhiteSpace = /(^[\s]+|[\s]+$)/g, captionArray = [], len;
            data = data.split(regExNewLine);
            len = data.length;
            for (var i = 0; i < len; i++) {
                var item = data[i];
                if (item.length > 0 && item !== "WEBVTT") {
                    if (item.match(regExToken)) {
                        var cuePoints = item.split(regExToken);
                        var sublines = data[i + 1];
                        captionArray.push({
                            start: convertCuePointTimes(cuePoints[0].replace(regExWhiteSpace, "")),
                            end: convertCuePointTimes(cuePoints[1].replace(regExWhiteSpace, "")),
                            data: sublines
                        });
                    }
                }
            }
            return Q.when(captionArray);
        }
    };
};

MediaPlayer.dependencies.protection.CommonEncryption = {
    findCencContentProtection: function(cpArray) {
        var retVal = null;
        for (var i = 0; i < cpArray.length; ++i) {
            var cp = cpArray[i];
            if (cp.schemeIdUri.toLowerCase() === "urn:mpeg:dash:mp4protection:2011" && cp.value.toLowerCase() === "cenc") retVal = cp;
        }
        return retVal;
    },
    getPSSHData: function(pssh) {
        return pssh.slice(32);
    },
    getPSSHForKeySystem: function(keySystem, initData) {
        var psshList = MediaPlayer.dependencies.protection.CommonEncryption.parsePSSHList(initData);
        if (psshList.hasOwnProperty(keySystem.uuid.toLowerCase())) {
            return psshList[keySystem.uuid.toLowerCase()];
        }
        return null;
    },
    parseInitDataFromContentProtection: function(cpData) {
        if ("pssh" in cpData) {
            return BASE64.decodeArray(cpData.pssh.__text).buffer;
        }
        return null;
    },
    parsePSSHList: function(data) {
        if (data === null) return [];
        var dv = new DataView(data), done = false;
        var pssh = {};
        var byteCursor = 0;
        while (!done) {
            var size, nextBox, version, systemID, psshDataSize, boxStart = byteCursor;
            if (byteCursor >= dv.buffer.byteLength) break;
            size = dv.getUint32(byteCursor);
            nextBox = byteCursor + size;
            byteCursor += 4;
            if (dv.getUint32(byteCursor) !== 1886614376) {
                byteCursor = nextBox;
                continue;
            }
            byteCursor += 4;
            version = dv.getUint8(byteCursor);
            if (version !== 0 && version !== 1) {
                byteCursor = nextBox;
                continue;
            }
            byteCursor += 1;
            byteCursor += 3;
            systemID = "";
            var i, val;
            for (i = 0; i < 4; i++) {
                val = dv.getUint8(byteCursor + i).toString(16);
                systemID += val.length === 1 ? "0" + val : val;
            }
            byteCursor += 4;
            systemID += "-";
            for (i = 0; i < 2; i++) {
                val = dv.getUint8(byteCursor + i).toString(16);
                systemID += val.length === 1 ? "0" + val : val;
            }
            byteCursor += 2;
            systemID += "-";
            for (i = 0; i < 2; i++) {
                val = dv.getUint8(byteCursor + i).toString(16);
                systemID += val.length === 1 ? "0" + val : val;
            }
            byteCursor += 2;
            systemID += "-";
            for (i = 0; i < 2; i++) {
                val = dv.getUint8(byteCursor + i).toString(16);
                systemID += val.length === 1 ? "0" + val : val;
            }
            byteCursor += 2;
            systemID += "-";
            for (i = 0; i < 6; i++) {
                val = dv.getUint8(byteCursor + i).toString(16);
                systemID += val.length === 1 ? "0" + val : val;
            }
            byteCursor += 6;
            systemID = systemID.toLowerCase();
            psshDataSize = dv.getUint32(byteCursor);
            byteCursor += 4;
            pssh[systemID] = dv.buffer.slice(boxStart, nextBox);
            byteCursor = nextBox;
        }
        return pssh;
    }
};

MediaPlayer.dependencies.protection.KeySystem = {
    eventList: {
        ENAME_LICENSE_REQUEST_COMPLETE: "licenseRequestComplete"
    }
};

MediaPlayer.dependencies.protection.KeySystem_Access = function() {
    "use strict";
};

MediaPlayer.dependencies.protection.KeySystem_Access.prototype = {
    constructor: MediaPlayer.dependencies.protection.KeySystem_Access
};

MediaPlayer.dependencies.protection.KeySystem_ClearKey = function() {
    "use strict";
    var keySystemStr = "org.w3.clearkey", keySystemUUID = "1077efec-c0b2-4d02-ace3-3c1e52e2fb4b", protData, requestClearKeyLicense = function(message, requestData) {
        var self = this, i, laURL = protData && protData.laURL && protData.laURL !== "" ? protData.laURL : null;
        var jsonMsg = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(message)));
        if (laURL) {
            laURL += "/?";
            for (i = 0; i < jsonMsg.kids.length; i++) {
                laURL += jsonMsg.kids[i] + "&";
            }
            laURL = laURL.substring(0, laURL.length - 1);
            var xhr = new XMLHttpRequest();
            xhr.onload = function() {
                if (xhr.status == 200) {
                    if (!xhr.response.hasOwnProperty("keys")) {
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new Error("DRM: ClearKey Remote update, Illegal response JSON"));
                    }
                    for (i = 0; i < xhr.response.keys.length; i++) {
                        var keypair = xhr.response.keys[i], keyid = keypair.kid.replace(/=/g, "");
                        key = keypair.k.replace(/=/g, "");
                        keyPairs.push(new MediaPlayer.vo.protection.KeyPair(keyid, key));
                    }
                    var event = new MediaPlayer.vo.protection.LicenseRequestComplete(new MediaPlayer.vo.protection.ClearKeyKeySet(keyPairs), requestData);
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, event);
                } else {
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new Error('DRM: ClearKey Remote update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState));
                }
            };
            xhr.onabort = function() {
                self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new Error('DRM: ClearKey update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState));
            };
            xhr.onerror = function() {
                self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new Error('DRM: ClearKey update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState));
            };
            xhr.open("GET", laURL);
            xhr.responseType = "json";
            xhr.send();
        } else if (protData.clearkeys) {
            var keyPairs = [];
            for (i = 0; i < jsonMsg.kids.length; i++) {
                var keyID = jsonMsg.kids[i], key = protData.clearkeys.hasOwnProperty(keyID) ? protData.clearkeys[keyID] : null;
                if (!key) {
                    this.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new Error("DRM: ClearKey keyID (" + keyID + ") is not known!"));
                }
                keyPairs.push(new MediaPlayer.vo.protection.KeyPair(keyID, key));
            }
            var event = new MediaPlayer.vo.protection.LicenseRequestComplete(new MediaPlayer.vo.protection.ClearKeyKeySet(keyPairs), requestData);
            this.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, event);
        } else {
            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new Error("DRM: ClearKey has no way (URL or protection data) to retrieve keys"));
        }
    };
    return {
        system: undefined,
        schemeIdURI: "urn:uuid:" + keySystemUUID,
        systemString: keySystemStr,
        uuid: keySystemUUID,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        init: function(protectionData) {
            protData = protectionData;
        },
        doLicenseRequest: function(message, laURL, requestData) {
            requestClearKeyLicense.call(this, message, requestData);
        },
        getInitData: MediaPlayer.dependencies.protection.CommonEncryption.parseInitDataFromContentProtection
    };
};

MediaPlayer.dependencies.protection.KeySystem_ClearKey.prototype = {
    constructor: MediaPlayer.dependencies.protection.KeySystem_ClearKey
};

MediaPlayer.dependencies.protection.KeySystem_PlayReady = function() {
    "use strict";
    var keySystemStr = "com.microsoft.playready", keySystemUUID = "9a04f079-9840-4286-ab92-e65be0885f95", protData, requestLicense = function(message, laURL, requestData) {
        var decodedChallenge = null, headers = {}, headerName, key, headerOverrides, parser = new DOMParser(), xmlDoc, msg, bytes, self = this;
        bytes = new Uint16Array(message.buffer);
        msg = String.fromCharCode.apply(null, bytes);
        xmlDoc = parser.parseFromString(msg, "application/xml");
        if (xmlDoc.getElementsByTagName("Challenge")[0]) {
            var Challenge = xmlDoc.getElementsByTagName("Challenge")[0].childNodes[0].nodeValue;
            if (Challenge) {
                decodedChallenge = BASE64.decode(Challenge);
            }
        } else {
            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new MediaPlayer.vo.Error(null, "DRM: playready update, can not find Challenge in keyMessage", null));
        }
        var headerNameList = xmlDoc.getElementsByTagName("name");
        var headerValueList = xmlDoc.getElementsByTagName("value");
        if (headerNameList.length != headerValueList.length) {
            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new MediaPlayer.vo.Error(null, "DRM: playready update, invalid header name/value pair in keyMessage", null));
        }
        for (var i = 0; i < headerNameList.length; i++) {
            headers[headerNameList[i].childNodes[0].nodeValue] = headerValueList[i].childNodes[0].nodeValue;
        }
        if (protData && protData.bearerToken) {
            headers.Authorization = protData.bearerToken;
        }
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status == 200) {
                var event = new MediaPlayer.vo.protection.LicenseRequestComplete(new Uint8Array(xhr.response), requestData);
                self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, event);
            } else {
                self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR status is "' + xhr.statusText + '" (' + xhr.status + "), expected to be 200. readyState is " + xhr.readyState, null));
            }
        };
        xhr.onabort = function() {
            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState, null));
        };
        xhr.onerror = function() {
            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState, null));
        };
        xhr.open("POST", protData && protData.laURL && protData.laURL !== "" ? protData.laURL : laURL);
        xhr.responseType = "arraybuffer";
        headerOverrides = protData ? protData.httpRequestHeaders : null;
        if (headerOverrides) {
            for (key in headerOverrides) {
                headers[key] = headerOverrides[key];
            }
        }
        for (headerName in headers) {
            if ("authorization" === headerName.toLowerCase()) {
                xhr.withCredentials = true;
            }
            xhr.setRequestHeader(headerName, headers[headerName]);
        }
        if (protData && protData.withCredentials) xhr.withCredentials = true;
        xhr.send(decodedChallenge);
    }, parseInitDataFromContentProtection = function(cpData) {
        var byteCursor = 0, PROSize, PSSHSize, PSSHBoxType = new Uint8Array([ 112, 115, 115, 104, 0, 0, 0, 0 ]), playreadySystemID = new Uint8Array([ 154, 4, 240, 121, 152, 64, 66, 134, 171, 146, 230, 91, 224, 136, 95, 149 ]), uint8arraydecodedPROHeader = null, PSSHBoxBuffer, PSSHBox, PSSHData;
        if ("pro" in cpData) {
            uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.pro.__text);
        } else if ("prheader" in cpData) {
            uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.prheader.__text);
        } else {
            return null;
        }
        PROSize = uint8arraydecodedPROHeader.length;
        PSSHSize = 4 + PSSHBoxType.length + playreadySystemID.length + 4 + PROSize;
        PSSHBoxBuffer = new ArrayBuffer(PSSHSize);
        PSSHBox = new Uint8Array(PSSHBoxBuffer);
        PSSHData = new DataView(PSSHBoxBuffer);
        PSSHData.setUint32(byteCursor, PSSHSize);
        byteCursor += 4;
        PSSHBox.set(PSSHBoxType, byteCursor);
        byteCursor += PSSHBoxType.length;
        PSSHBox.set(playreadySystemID, byteCursor);
        byteCursor += playreadySystemID.length;
        PSSHData.setUint32(byteCursor, PROSize);
        byteCursor += 4;
        PSSHBox.set(uint8arraydecodedPROHeader, byteCursor);
        byteCursor += PROSize;
        return PSSHBox.buffer;
    }, isInitDataEqual = function() {
        return false;
    };
    return {
        schemeIdURI: "urn:uuid:" + keySystemUUID,
        systemString: keySystemStr,
        uuid: keySystemUUID,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        init: function(protectionData) {
            protData = protectionData;
        },
        doLicenseRequest: requestLicense,
        getInitData: parseInitDataFromContentProtection,
        initDataEquals: isInitDataEqual
    };
};

MediaPlayer.dependencies.protection.KeySystem_PlayReady.prototype = {
    constructor: MediaPlayer.dependencies.protection.KeySystem_PlayReady
};

MediaPlayer.dependencies.protection.KeySystem_Widevine = function() {
    "use strict";
    var keySystemStr = "com.widevine.alpha", keySystemUUID = "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed", protData, requestLicense = function(message, laURL, requestData) {
        var xhr = new XMLHttpRequest(), headers = {}, key, headerOverrides, headerName, url, self = this;
        url = protData && protData.laURL && protData.laURL !== "" ? protData.laURL : laURL;
        if (!url) {
            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new Error("DRM: No valid Widevine Proxy Server URL specified!"));
        } else {
            xhr.open("POST", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function() {
                if (this.status == 200) {
                    var event = new MediaPlayer.vo.protection.LicenseRequestComplete(new Uint8Array(this.response), requestData);
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, event);
                } else {
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new Error('DRM: widevine update, XHR status is "' + xhr.statusText + '" (' + xhr.status + "), expected to be 200. readyState is " + xhr.readyState) + ".  Response is " + (this.response ? String.fromCharCode.apply(null, new Uint8Array(this.response)) : "NONE"));
                }
            };
            xhr.onabort = function() {
                self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new Error('DRM: widevine update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState));
            };
            xhr.onerror = function() {
                self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, null, new Error('DRM: widevine update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState));
            };
            headerOverrides = protData ? protData.httpRequestHeaders : null;
            if (headerOverrides) {
                for (key in headerOverrides) {
                    headers[key] = headerOverrides[key];
                }
            }
            for (headerName in headers) {
                if ("authorization" === headerName.toLowerCase()) {
                    xhr.withCredentials = true;
                }
                xhr.setRequestHeader(headerName, headers[headerName]);
            }
            xhr.send(message);
        }
    };
    return {
        schemeIdURI: "urn:uuid:" + keySystemUUID,
        systemString: keySystemStr,
        uuid: keySystemUUID,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        init: function(protectionData) {
            protData = protectionData;
        },
        doLicenseRequest: requestLicense,
        getInitData: MediaPlayer.dependencies.protection.CommonEncryption.parseInitDataFromContentProtection
    };
};

MediaPlayer.dependencies.protection.KeySystem_Widevine.prototype = {
    constructor: MediaPlayer.dependencies.protection.KeySystem_Widevine
};

MediaPlayer.rules.BaseRulesCollection = function() {
    "use strict";
    var rules = [];
    return {
        downloadRatioRule: undefined,
        insufficientBufferRule: undefined,
        getRules: function() {
            return Q.when(rules);
        },
        setup: function() {
            var self = this;
            self.getRules().then(function(r) {
                r.push(self.downloadRatioRule);
                r.push(self.insufficientBufferRule);
            });
        }
    };
};

MediaPlayer.rules.BaseRulesCollection.prototype = {
    constructor: MediaPlayer.rules.BaseRulesCollection
};

MediaPlayer.rules.DownloadRatioRule = function() {
    "use strict";
    var checkRatio = function(newIdx, currentBandwidth, data) {
        var self = this, deferred = Q.defer();
        self.manifestExt.getRepresentationFor(newIdx, data).then(function(rep) {
            self.manifestExt.getBandwidth(rep).then(function(newBandwidth) {
                deferred.resolve(newBandwidth / currentBandwidth);
            });
        });
        return deferred.promise;
    };
    return {
        debug: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        checkIndex: function(current, metrics, data) {
            var self = this, lastRequest = self.metricsExt.getCurrentHttpRequest(metrics), downloadTime, totalTime, downloadRatio, totalRatio, switchRatio, deferred, funcs, i, len, DOWNLOAD_RATIO_SAFETY_FACTOR = .75;
            if (!metrics) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (lastRequest === null) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1e3;
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1e3;
            if (totalTime <= 0) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (lastRequest.mediaduration === null || lastRequest.mediaduration === undefined || lastRequest.mediaduration <= 0 || isNaN(lastRequest.mediaduration)) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            deferred = Q.defer();
            totalRatio = lastRequest.mediaduration / totalTime;
            downloadRatio = lastRequest.mediaduration / downloadTime * DOWNLOAD_RATIO_SAFETY_FACTOR;
            if (isNaN(downloadRatio) || isNaN(totalRatio)) {
                self.debug.log("The ratios are NaN, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (isNaN(downloadRatio)) {
                deferred.resolve(new MediaPlayer.rules.SwitchRequest());
            } else if (downloadRatio < 4) {
                if (current > 0) {
                    self.debug.log("We are not at the lowest bitrate, so switch down.");
                    self.manifestExt.getRepresentationFor(current - 1, data).then(function(representation1) {
                        self.manifestExt.getBandwidth(representation1).then(function(oneDownBandwidth) {
                            self.manifestExt.getRepresentationFor(current, data).then(function(representation2) {
                                self.manifestExt.getBandwidth(representation2).then(function(currentBandwidth) {
                                    switchRatio = oneDownBandwidth / currentBandwidth;
                                    if (downloadRatio < switchRatio) {
                                        self.debug.log("Things must be going pretty bad, switch all the way down.");
                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(0));
                                    } else {
                                        self.debug.log("Things could be better, so just switch down one index.");
                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(current - 1));
                                    }
                                });
                            });
                        });
                    });
                } else {
                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                }
            } else {
                self.manifestExt.getRepresentationCount(data).then(function(max) {
                    max -= 1;
                    if (current < max) {
                        self.manifestExt.getRepresentationFor(current + 1, data).then(function(representation1) {
                            self.manifestExt.getBandwidth(representation1).then(function(oneUpBandwidth) {
                                self.manifestExt.getRepresentationFor(current, data).then(function(representation2) {
                                    self.manifestExt.getBandwidth(representation2).then(function(currentBandwidth) {
                                        switchRatio = oneUpBandwidth / currentBandwidth;
                                        if (downloadRatio >= switchRatio) {
                                            if (downloadRatio > 100) {
                                                self.debug.log("Tons of bandwidth available, go all the way up.");
                                                deferred.resolve(new MediaPlayer.rules.SwitchRequest(max - 1));
                                            } else if (downloadRatio > 10) {
                                                self.debug.log("Just enough bandwidth available, switch up one.");
                                                deferred.resolve(new MediaPlayer.rules.SwitchRequest(current + 1));
                                            } else {
                                                i = -1;
                                                funcs = [];
                                                while ((i += 1) < max) {
                                                    funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                                                }
                                                Q.all(funcs).then(function(results) {
                                                    for (i = 0, len = results.length; i < len; i += 1) {
                                                        if (downloadRatio < results[i]) {
                                                            break;
                                                        }
                                                    }
                                                    self.debug.log("Calculated ideal new quality index is: " + i);
                                                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(i));
                                                });
                                            }
                                        } else {
                                            deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                                        }
                                    });
                                });
                            });
                        });
                    } else {
                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(max));
                    }
                });
            }
            return deferred.promise;
        }
    };
};

MediaPlayer.rules.DownloadRatioRule.prototype = {
    constructor: MediaPlayer.rules.DownloadRatioRule
};

MediaPlayer.rules.InsufficientBufferRule = function() {
    "use strict";
    var dryBufferHits = 0, DRY_BUFFER_LIMIT = 3;
    return {
        debug: undefined,
        checkIndex: function(current, metrics) {
            var self = this, playlist, trace, shift = false, p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
            if (metrics.PlayList === null || metrics.PlayList === undefined || metrics.PlayList.length === 0) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            playlist = metrics.PlayList[metrics.PlayList.length - 1];
            if (playlist === null || playlist === undefined || playlist.trace.length === 0) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            trace = playlist.trace[playlist.trace.length - 2];
            if (trace === null || trace === undefined || trace.stopreason === null || trace.stopreason === undefined) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (trace.stopreason === MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON) {
                shift = true;
                dryBufferHits += 1;
                self.debug.log("Number of times the buffer has run dry: " + dryBufferHits);
            }
            if (dryBufferHits > DRY_BUFFER_LIMIT) {
                p = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                self.debug.log("Apply STRONG to buffer rule.");
            }
            if (shift) {
                self.debug.log("The buffer ran dry recently, switch down.");
                return Q.when(new MediaPlayer.rules.SwitchRequest(current - 1, p));
            } else if (dryBufferHits > DRY_BUFFER_LIMIT) {
                self.debug.log("Too many dry buffer hits, quit switching bitrates.");
                return Q.when(new MediaPlayer.rules.SwitchRequest(current, p));
            } else {
                return Q.when(new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, p));
            }
        }
    };
};

MediaPlayer.rules.InsufficientBufferRule.prototype = {
    constructor: MediaPlayer.rules.InsufficientBufferRule
};

MediaPlayer.rules.LimitSwitchesRule = function() {
    "use strict";
    var MAX_SWITCHES = 10, VALIDATION_TIME = 2e4, WAIT_COUNT = 5, waiting = 0;
    return {
        debug: undefined,
        checkIndex: function(current, metrics) {
            if (waiting > 0) {
                waiting -= 1;
                return Q.when(new MediaPlayer.rules.SwitchRequest(current, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            }
            var self = this, panic = false, rs, now = new Date().getTime(), delay, i, numSwitches = metrics.RepSwitchList.length;
            for (i = numSwitches - 1; i >= 0; i -= 1) {
                rs = metrics.RepSwitchList[i];
                delay = now - rs.t.getTime();
                if (delay >= VALIDATION_TIME) {
                    self.debug.log("Reached time limit, bailing.");
                    break;
                }
                if (i >= MAX_SWITCHES) {
                    self.debug.log("Found too many switches within validation time, force the stream to not change.");
                    panic = true;
                    break;
                }
            }
            if (panic) {
                self.debug.log("Wait some time before allowing another switch.");
                waiting = WAIT_COUNT;
                return Q.when(new MediaPlayer.rules.SwitchRequest(current, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            } else {
                return Q.when(new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            }
        }
    };
};

MediaPlayer.rules.LimitSwitchesRule.prototype = {
    constructor: MediaPlayer.rules.LimitSwitchesRule
};

MediaPlayer.rules.SwitchRequest = function(q, p) {
    "use strict";
    this.quality = q;
    this.priority = p;
    if (this.quality === undefined) {
        this.quality = 999;
    }
    if (this.priority === undefined) {
        this.priority = .5;
    }
};

MediaPlayer.rules.SwitchRequest.prototype = {
    constructor: MediaPlayer.rules.SwitchRequest,
    NO_CHANGE: 999,
    DEFAULT: .5,
    STRONG: 1,
    WEAK: 0
};

MediaPlayer.vo.Event = function() {
    "use strict";
    this.type = null;
    this.sender = null;
    this.data = null;
    this.error = null;
    this.timestamp = NaN;
};

MediaPlayer.vo.Event.prototype = {
    constructor: MediaPlayer.vo.Event
};

MediaPlayer.vo.protection.KeyError = function(sessionToken, errorString) {
    "use strict";
    this.sessionToken = sessionToken;
    this.error = errorString;
};

MediaPlayer.vo.protection.KeyError.prototype = {
    constructor: MediaPlayer.vo.protection.KeyError
};

MediaPlayer.vo.protection.KeyMessage = function(sessionToken, message, defaultURL, messageType) {
    "use strict";
    this.sessionToken = sessionToken;
    this.message = message;
    this.defaultURL = defaultURL;
    this.messageType = messageType;
};

MediaPlayer.vo.protection.KeyMessage.prototype = {
    constructor: MediaPlayer.vo.protection.KeyMessage
};

MediaPlayer.vo.protection.KeySystemAccess = function(keySystem, ksConfiguration) {
    this.keySystem = keySystem;
    this.ksConfiguration = ksConfiguration;
};

MediaPlayer.vo.protection.KeySystemAccess.prototype = {
    constructor: MediaPlayer.vo.protection.KeySystemAccess
};

MediaPlayer.vo.protection.KeySystemConfiguration = function(audioCapabilities, videoCapabilities, distinctiveIdentifier, persistentState) {
    this.initDataTypes = [ "cenc" ];
    this.audioCapabilities = audioCapabilities;
    this.videoCapabilities = videoCapabilities;
    this.distinctiveIdentifier = distinctiveIdentifier;
    this.persistentState = persistentState;
};

MediaPlayer.vo.protection.KeySystemConfiguration.prototype = {
    constructor: MediaPlayer.vo.protection.KeySystemConfiguration
};

MediaPlayer.vo.protection.LicenseRequestComplete = function(message, requestData) {
    "use strict";
    this.message = message;
    this.requestData = requestData;
};

MediaPlayer.vo.protection.LicenseRequestComplete.prototype = {
    constructor: MediaPlayer.vo.protection.LicenseRequestComplete
};

MediaPlayer.vo.protection.MediaCapability = function(contentType, robustness) {
    this.contentType = contentType;
    this.robustness = robustness;
};

MediaPlayer.vo.protection.MediaCapability.prototype = {
    constructor: MediaPlayer.vo.protection.MediaCapability
};

MediaPlayer.vo.MediaInfo = function() {
    "use strict";
    this.id = null;
    this.index = null;
    this.type = null;
    this.streamInfo = null;
    this.trackCount = 0;
    this.lang = null;
    this.codec = null;
    this.mimeType = null;
    this.contentProtection = null;
    this.isText = false;
    this.KID = null;
    this.bitrateList = null;
};

MediaPlayer.vo.MediaInfo.prototype = {
    constructor: MediaPlayer.vo.MediaInfo
};

MediaPlayer.models.MetricsList = function() {
    "use strict";
    return {
        TcpList: [],
        HttpList: [],
        RepSwitchList: [],
        BufferLevel: [],
        PlayList: [],
        DroppedFrames: [],
        DVRInfo: [],
        ManifestUpdate: []
    };
};

MediaPlayer.models.MetricsList.prototype = {
    constructor: MediaPlayer.models.MetricsList
};

MediaPlayer.vo.Mp4Track = function() {
    "use strict";
    this.type = "und";
    this.trackId = 0;
    this.timescale = 0;
    this.duration = 0;
    this.codecs = "";
    this.codecPrivateData = "";
    this.bandwidth = "";
    this.width = 0;
    this.height = 0;
    this.language = "und";
    this.channels = 0;
    this.samplingRate = 0;
    this.contentProtection = undefined;
    this.samples = [];
    this.data = null;
};

MediaPlayer.vo.Mp4Track.prototype = {
    constructor: MediaPlayer.vo.Mp4Track
};

MediaPlayer.vo.Mp4Track.Sample = function() {
    "use strict";
    this.dts = 0;
    this.cts = 0;
    this.duration = 0;
    this.data = null;
    this.size = 0;
};

MediaPlayer.vo.Mp4Track.Sample.prototype = {
    constructor: MediaPlayer.vo.Mp4Track.Sample
};

MediaPlayer.vo.protection.NeedKey = function(initData, initDataType) {
    this.initData = initData;
    this.initDataType = initDataType;
};

MediaPlayer.vo.protection.NeedKey.prototype = {
    constructor: MediaPlayer.vo.protection.NeedKey
};

MediaPlayer.vo.SegmentRequest = function() {
    "use strict";
    this.action = "download";
    this.startTime = NaN;
    this.streamType = null;
    this.type = null;
    this.duration = NaN;
    this.timescale = NaN;
    this.range = null;
    this.url = null;
    this.requestStartDate = null;
    this.firstByteDate = null;
    this.requestEndDate = null;
    this.deferred = null;
    this.quality = NaN;
    this.index = NaN;
    this.availabilityStartTime = null;
    this.availabilityEndTime = null;
    this.wallStartTime = null;
};

MediaPlayer.vo.SegmentRequest.prototype = {
    constructor: MediaPlayer.vo.SegmentRequest,
    ACTION_DOWNLOAD: "download",
    ACTION_COMPLETE: "complete"
};

MediaPlayer.models.SessionToken = function() {
    "use strict";
};

MediaPlayer.models.SessionToken.prototype = {
    initData: null,
    getSessionID: function() {
        return "";
    },
    getExpirationTime: function() {
        return NaN;
    },
    getKeyStatuses: function() {
        return null;
    }
};

MediaPlayer.vo.URIFragmentData = function() {
    "use strict";
    this.t = null;
    this.xywh = null;
    this.track = null;
    this.id = null;
    this.s = null;
};

MediaPlayer.vo.URIFragmentData.prototype = {
    constructor: MediaPlayer.vo.URIFragmentData
};

MediaPlayer.vo.metrics.BufferLevel = function() {
    "use strict";
    this.t = null;
    this.level = null;
};

MediaPlayer.vo.metrics.BufferLevel.prototype = {
    constructor: MediaPlayer.vo.metrics.BufferLevel
};

MediaPlayer.vo.metrics.DVRInfo = function() {
    "use strict";
    this.time = null;
    this.range = null;
    this.mpd = null;
};

MediaPlayer.vo.metrics.DVRInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.DVRInfo
};

MediaPlayer.vo.metrics.DroppedFrames = function() {
    "use strict";
    this.time = null;
    this.droppedFrames = null;
};

MediaPlayer.vo.metrics.DroppedFrames.prototype = {
    constructor: MediaPlayer.vo.metrics.DroppedFrames
};

MediaPlayer.vo.metrics.HTTPRequest = function() {
    "use strict";
    this.stream = null;
    this.tcpid = null;
    this.type = null;
    this.url = null;
    this.actualurl = null;
    this.range = null;
    this.trequest = null;
    this.tresponse = null;
    this.tfinish = null;
    this.responsecode = null;
    this.interval = null;
    this.mediaduration = null;
    this.trace = [];
    this.startTime = null;
    this.quality = null;
    this.bytesLength = null;
};

MediaPlayer.vo.metrics.HTTPRequest.prototype = {
    constructor: MediaPlayer.vo.metrics.HTTPRequest
};

MediaPlayer.vo.metrics.HTTPRequest.Trace = function() {
    "use strict";
    this.s = null;
    this.d = null;
    this.b = [];
};

MediaPlayer.vo.metrics.HTTPRequest.Trace.prototype = {
    constructor: MediaPlayer.vo.metrics.HTTPRequest.Trace
};

MediaPlayer.vo.metrics.ManifestUpdate = function() {
    "use strict";
    this.streamType = null;
    this.type = null;
    this.requestTime = null;
    this.fetchTime = null;
    this.availabilityStartTime = null;
    this.presentationStartTime = 0;
    this.clientTimeOffset = 0;
    this.currentTime = null;
    this.buffered = null;
    this.latency = 0;
    this.periodInfo = [];
    this.representationInfo = [];
};

MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo = function() {
    "use strict";
    this.id = null;
    this.index = null;
    this.start = null;
    this.duration = null;
};

MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo = function() {
    "use strict";
    this.id = null;
    this.index = null;
    this.streamType = null;
    this.periodIndex = null;
    this.presentationTimeOffset = null;
    this.startNumber = null;
    this.segmentInfoType = null;
};

MediaPlayer.vo.metrics.ManifestUpdate.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate
};

MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo
};

MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo
};

MediaPlayer.vo.metrics.PlayList = function() {
    "use strict";
    this.stream = null;
    this.start = null;
    this.mstart = null;
    this.starttype = null;
    this.trace = [];
};

MediaPlayer.vo.metrics.PlayList.Trace = function() {
    "use strict";
    this.representationid = null;
    this.subreplevel = null;
    this.start = null;
    this.mstart = null;
    this.duration = null;
    this.playbackspeed = null;
    this.stopreason = null;
};

MediaPlayer.vo.metrics.PlayList.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList
};

MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON = "initial_start";

MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON = "seek";

MediaPlayer.vo.metrics.PlayList.Trace.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList.Trace()
};

MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON = "user_request";

MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON = "representation_switch";

MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON = "end_of_content";

MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON = "rebuffering";

MediaPlayer.vo.metrics.RepresentationSwitch = function() {
    "use strict";
    this.t = null;
    this.mt = null;
    this.to = null;
    this.lto = null;
};

MediaPlayer.vo.metrics.RepresentationSwitch.prototype = {
    constructor: MediaPlayer.vo.metrics.RepresentationSwitch
};

MediaPlayer.vo.metrics.TCPConnection = function() {
    "use strict";
    this.tcpid = null;
    this.dest = null;
    this.topen = null;
    this.tclose = null;
    this.tconnect = null;
};

MediaPlayer.vo.metrics.TCPConnection.prototype = {
    constructor: MediaPlayer.vo.metrics.TCPConnection
};

Custom = function() {
    "use strict";
    return {
        dependencies: {},
        di: {},
        models: {},
        modules: {},
        utils: {},
        rules: {},
        vo: {
            metrics: {}
        }
    };
}();

var _paq = _paq || [];

_paq.push([ "trackPageView" ]);

_paq.push([ "enableLinkTracking" ]);

(function() {
    var u = "//tv-has.orange-labs.fr/piwik/";
    _paq.push([ "setTrackerUrl", u + "piwik.php" ]);
    _paq.push([ "setSiteId", 1 ]);
    var d = document, g = d.createElement("script"), s = d.getElementsByTagName("script")[0];
    g.type = "text/javascript";
    g.async = true;
    g.defer = true;
    g.src = u + "piwik.js";
    s.parentNode.insertBefore(g, s);
})();

Custom.dependencies.CustomAbrController = function() {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.AbrController);
    rslt.manifestExt = undefined;
    rslt.debug = undefined;
    rslt.config = undefined;
    rslt.getRepresentationBandwidth = function(data, index) {
        var self = this, deferred = Q.defer();
        self.manifestExt.getRepresentationFor(index, data).then(function(rep) {
            self.manifestExt.getBandwidth(rep).then(function(bandwidth) {
                deferred.resolve(bandwidth);
            });
        });
        return deferred.promise;
    };
    rslt.getQualityBoundaries = function(type, data) {
        var self = this, deferred = Q.defer(), qualityMin = self.config.getParamFor(type, "ABR.minQuality", "number", -1), qualityMax = self.config.getParamFor(type, "ABR.maxQuality", "number", -1), bandwidthMin = self.config.getParamFor(type, "ABR.minBandwidth", "number", -1), bandwidthMax = self.config.getParamFor(type, "ABR.maxBandwidth", "number", -1), i, funcs = [];
        self.debug.log("[AbrController][" + type + "] Quality   boundaries: [" + qualityMin + "," + qualityMax + "]");
        self.debug.log("[AbrController][" + type + "] Bandwidth boundaries: [" + bandwidthMin + "," + bandwidthMax + "]");
        self.manifestExt.getRepresentationCount(data).then(function(count) {
            if (bandwidthMin !== -1 || bandwidthMax !== -1) {
                for (i = 0; i < count; i += 1) {
                    funcs.push(rslt.getRepresentationBandwidth.call(self, data, i));
                }
                Q.all(funcs).then(function(bandwidths) {
                    if (bandwidthMin !== -1) {
                        for (i = 0; i < count; i += 1) {
                            if (bandwidths[i] >= bandwidthMin) {
                                qualityMin = qualityMin === -1 ? i : Math.max(i, qualityMin);
                                break;
                            }
                        }
                    }
                    if (bandwidthMax !== -1) {
                        for (i = count - 1; i >= 0; i -= 1) {
                            if (bandwidths[i] <= bandwidthMax) {
                                qualityMax = qualityMax === -1 ? i : Math.min(i, qualityMax);
                                break;
                            }
                        }
                    }
                });
            }
            qualityMin = qualityMin >= count ? count - 1 : qualityMin;
            qualityMax = qualityMax >= count ? count - 1 : qualityMax;
            deferred.resolve({
                min: qualityMin,
                max: qualityMax
            });
        });
        return deferred.promise;
    };
    rslt.getPlaybackQuality = function(type, data) {
        var self = this, deferred = Q.defer(), previousQuality = self.getQualityFor(type), qualityMin = -1, qualityMax = -1, quality, switchUpIncrementally = self.config.getParamFor(type, "ABR.switchUpIncrementally", "boolean", false);
        self.parent.getPlaybackQuality.call(self, type, data).then(function(result) {
            quality = result.quality;
            if (self.getAutoSwitchBitrate()) {
                if (switchUpIncrementally && quality > previousQuality) {
                    self.debug.log("[AbrController][" + type + "] Incremental switch => quality: " + quality);
                    quality = previousQuality + 1;
                }
                rslt.getQualityBoundaries.call(self, type, data).then(function(qualityBoundaries) {
                    qualityMin = qualityBoundaries.min;
                    qualityMax = qualityBoundaries.max;
                    if (qualityMin !== -1 && quality < qualityMin) {
                        quality = qualityMin;
                        self.debug.log("[AbrController][" + type + "] New quality < min => " + quality);
                    }
                    if (qualityMax !== -1 && quality > qualityMax) {
                        quality = qualityMax;
                        self.debug.log("[AbrController][" + type + "] New quality > max => " + quality);
                    }
                    self.parent.setPlaybackQuality.call(self, type, quality);
                    deferred.resolve({
                        quality: quality,
                        confidence: result.confidence
                    });
                });
            } else {
                deferred.resolve({
                    quality: quality,
                    confidence: result.confidence
                });
            }
        });
        return deferred.promise;
    };
    return rslt;
};

Custom.dependencies.CustomAbrController.prototype = {
    constructor: Custom.dependencies.CustomAbrController
};

Custom.dependencies.CustomBufferController = function() {
    "use strict";
    var QUOTA_EXCEEDED_ERROR_CODE = 22, READY = "READY", state = READY, ready = false, started = false, waitingForBuffer = false, initialPlayback = true, initializationData = [], currentSegmentTime = 0, seeking = false, seekTarget = -1, dataChanged = true, availableRepresentations, currentRepresentation, currentQuality = -1, initialQuality = -1, stalled = false, isDynamic = false, isBufferingCompleted = false, deferredAppends = [], deferredStreamComplete = Q.defer(), deferredRejectedDataAppend = null, deferredBuffersFlatten = null, periodInfo = null, fragmentsToLoad = 0, fragmentModel = null, bufferLevel = 0, isQuotaExceeded = false, rejectedBytes = null, fragmentDuration = 0, appendingRejectedData = false, mediaSource, type, data = null, buffer = null, minBufferTime, minBufferTimeAtStartup, bufferTimeout, playListMetrics = null, playListTraceMetrics = null, playListTraceMetricsClosed = true, inbandEventFound = false, htmlVideoState = -1, lastBufferLevel = -1, deferredFragmentBuffered = null, appendSync = false, currentSequenceNumber = -1, sendRequest = function() {
        if (!isRunning.call(this)) {
            return;
        }
        if (fragmentModel !== null) {
            this.fragmentController.onBufferControllerStateChange();
        }
    }, clearPlayListTraceMetrics = function(endTime, stopreason) {
        var duration = 0, startTime = null;
        if (playListTraceMetricsClosed === false) {
            startTime = playListTraceMetrics.start;
            duration = endTime.getTime() - startTime.getTime();
            playListTraceMetrics.duration = duration;
            playListTraceMetrics.stopreason = stopreason;
            playListTraceMetricsClosed = true;
        }
    }, setStalled = function(value) {
        var self = this;
        self.debug.info("[BufferController][" + type + "] stalled = ", value);
        stalled = value;
        self.videoModel.stallStream(type, stalled);
    }, startPlayback = function() {
        if (!ready || !started) {
            return;
        }
        this.debug.info("[BufferController][" + type + "] startPlayback");
        setStalled.call(this, true);
        checkIfSufficientBuffer.call(this);
    }, doStart = function() {
        var currentTime, self = this;
        if (started === true) {
            return;
        }
        if (seeking === false) {
            currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
        }
        if (isBufferingCompleted) {
            isBufferingCompleted = false;
        }
        started = true;
        self.debug.info("[BufferController][" + type + "] ### START");
        waitingForBuffer = true;
        startPlayback.call(self);
    }, doSeek = function(time) {
        var self = this, currentTime = new Date();
        if (seeking === true && seekTarget === time) {
            return;
        }
        this.debug.info("[BufferController][" + type + "] ### SEEK: " + time);
        if (started === true) {
            doStop.call(self);
        }
        this.debug.log("[BufferController][" + type + "] ### Reset quality: " + initialQuality);
        this.abrController.setPlaybackQuality(type, initialQuality);
        playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
        seeking = true;
        seekTarget = time;
        Q.when(deferredFragmentBuffered ? deferredFragmentBuffered.promise : true).then(function() {
            currentRepresentation.segments = null;
            doStart.call(self);
        });
    }, doStop = function() {
        if (!started) {
            return;
        }
        this.debug.info("[BufferController][" + type + "] ### STOP");
        htmlVideoState = -1;
        clearTimeout(bufferTimeout);
        started = false;
        waitingForBuffer = false;
        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
        this.fragmentController.abortRequestsForModel(fragmentModel);
    }, getRepresentationForQuality = function(quality) {
        return availableRepresentations[quality];
    }, onBytesLoadingStart = function(request) {
        this.debug.info("[BufferController][" + type + "] ### Load request ", request.url !== null ? request.url : request.quality);
    }, onBytesLoaded = function(request, response) {
        if (this.fragmentController.isInitializationRequest(request)) {
            onInitializationLoaded.call(this, request, response);
        } else {
            onMediaLoaded.call(this, request, response);
        }
    }, onInitializationLoaded = function(request, response) {
        var self = this, initData = response.data, quality = request.quality;
        self.debug.log("[BufferController][" + type + "] ### Initialization loaded ", quality);
        self.fragmentController.process(initData).then(function(data) {
            if (data !== null) {
                initializationData[quality] = data;
                if (quality === currentQuality) {
                    self.debug.info("[BufferController][" + type + "] ### Buffer initialization segment ", request.url !== null ? request.url : request.quality);
                    appendToBuffer.call(self, data, request.quality).then(function() {
                        self.debug.log("[BufferController][" + type + "] ### Initialization segment buffered");
                        loadNextFragment.call(self);
                    });
                }
            } else {
                self.debug.log("No " + type + " bytes to push.");
                loadNextFragment.call(self);
            }
        });
    }, onMediaLoaded = function(request, response) {
        var self = this, currentRepresentation = getRepresentationForQuality.call(self, request.quality), eventStreamAdaption = this.manifestExt.getEventStreamForAdaptationSet(self.getData()), eventStreamRepresentation = this.manifestExt.getEventStreamForRepresentation(self.getData(), currentRepresentation);
        self.debug.log("[BufferController][" + type + "] ### Media loaded ", request.url);
        if (self.ChunkMissingState !== false) {
            self.ChunkMissingState = true;
        }
        if (!fragmentDuration && !isNaN(request.duration)) {
            fragmentDuration = request.duration;
        }
        self.fragmentController.process(response.data, request, availableRepresentations).then(function(data) {
            if (data !== null) {
                if (eventStreamAdaption.length > 0 || eventStreamRepresentation.length > 0) {
                    handleInbandEvents.call(self, data, request, eventStreamAdaption, eventStreamRepresentation).then(function(events) {
                        self.eventController.addInbandEvents(events);
                    });
                }
                self.debug.info("[BufferController][" + type + "] ### Buffer segment from url ", request.url);
                deleteInbandEvents.call(self, data).then(function(data) {
                    appendToBuffer.call(self, data, request.quality, request.index).then(function() {
                        self.debug.log("[BufferController][" + type + "] ### Media segment buffered");
                        signalSegmentBuffered.call(self);
                        checkIfSufficientBuffer.call(self);
                    });
                });
            } else {
                self.debug.log("[BufferController][" + type + "] Error with segment data, no bytes to push");
                signalSegmentBuffered.call(self);
                checkIfSufficientBuffer.call(self);
            }
        });
    }, appendToBuffer = function(data, quality, index) {
        var self = this, deferred = Q.defer(), isInit = index === undefined, currentVideoTime = self.videoModel.getCurrentTime(), currentTime = new Date();
        if (playListTraceMetricsClosed === true) {
            playListTraceMetricsClosed = false;
            playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentRepresentation.id, null, currentTime, currentVideoTime, null, 1, null);
        }
        if (!hasData()) return;
        hasEnoughSpaceToAppend.call(self).then(function() {
            Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : true).then(function() {
                if (!hasData()) return;
                self.debug.info("[BufferController][" + type + "] Buffering segment");
                self.sourceBufferExt.append(buffer, data, appendSync).then(function() {
                    self.debug.info("[BufferController][" + type + "] Segment buffered");
                    if (isInit) {
                        currentQuality = quality;
                    }
                    isQuotaExceeded = false;
                    if (isDynamic) {
                        removeBuffer.call(self, -1, self.videoModel.getCurrentTime() - minBufferTime).then(function() {
                            debugBufferRange.call(self);
                            deferred.resolve();
                        });
                    } else {
                        debugBufferRange.call(self);
                        deferred.resolve();
                    }
                    self.system.notify("bufferUpdated");
                }, function(result) {
                    self.metricsModel.addError(type, result.err.code, result.err.message, self.videoModel.getCurrentTime());
                    self.debug.log("[BufferController][" + type + "] Buffer failed with quality = " + quality + " index = " + index);
                    if (result.err.code === QUOTA_EXCEEDED_ERROR_CODE) {
                        rejectedBytes = {
                            data: data,
                            quality: quality,
                            index: index
                        };
                        deferredRejectedDataAppend = deferred;
                        isQuotaExceeded = true;
                        fragmentsToLoad = 0;
                        doStop.call(self);
                    }
                });
            });
        });
        return deferred.promise;
    }, debugBufferRange = function() {
        var ranges = null, i, len;
        if (this.debug.getLogToBrowserConsole()) {
            ranges = this.sourceBufferExt.getAllRanges(buffer);
            if (ranges === null || ranges.length === 0) {
                return;
            }
            for (i = 0, len = ranges.length; i < len; i += 1) {
                this.debug.info("[BufferController][" + type + "] ### Buffered " + type + " range [" + i + "]: " + ranges.start(i) + " - " + ranges.end(i) + " (" + this.getVideoModel().getCurrentTime() + ")");
            }
        }
    }, handleInbandEvents = function(data, request, adaptionSetInbandEvents, representationInbandEvents) {
        var events = [], i = 0, identifier, size, expTwo = Math.pow(256, 2), expThree = Math.pow(256, 3), segmentStarttime = Math.max(isNaN(request.startTime) ? 0 : request.startTime, 0), eventStreams = [], inbandEvents;
        inbandEventFound = false;
        inbandEvents = adaptionSetInbandEvents.concat(representationInbandEvents);
        for (var loop = 0; loop < inbandEvents.length; loop++) {
            eventStreams[inbandEvents[loop].schemeIdUri] = inbandEvents[loop];
        }
        while (i < data.length) {
            identifier = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
            size = data[i] * expThree + data[i + 1] * expTwo + data[i + 2] * 256 + data[i + 3] * 1;
            if (identifier == "moov" || identifier == "moof") {
                break;
            } else if (identifier == "emsg") {
                inbandEventFound = true;
                var eventBox = [ "", "", 0, 0, 0, 0, "" ], arrIndex = 0, j = i + 12;
                while (j < size + i) {
                    if (arrIndex === 0 || arrIndex == 1 || arrIndex == 6) {
                        if (data[j] !== 0) {
                            eventBox[arrIndex] += String.fromCharCode(data[j]);
                        } else {
                            arrIndex += 1;
                        }
                        j += 1;
                    } else {
                        eventBox[arrIndex] = data[j] * expThree + data[j + 1] * expTwo + data[j + 2] * 256 + data[j + 3] * 1;
                        j += 4;
                        arrIndex += 1;
                    }
                }
                var schemeIdUri = eventBox[0], value = eventBox[1], timescale = eventBox[2], presentationTimeDelta = eventBox[3], duration = eventBox[4], id = eventBox[5], messageData = eventBox[6], presentationTime = segmentStarttime * timescale + presentationTimeDelta;
                if (eventStreams[schemeIdUri]) {
                    var event = new Dash.vo.Event();
                    event.eventStream = eventStreams[schemeIdUri];
                    event.eventStream.value = value;
                    event.eventStream.timescale = timescale;
                    event.duration = duration;
                    event.id = id;
                    event.presentationTime = presentationTime;
                    event.messageData = messageData;
                    event.presentationTimeDelta = presentationTimeDelta;
                    events.push(event);
                }
            }
            i += size;
        }
        return Q.when(events);
    }, deleteInbandEvents = function(data) {
        if (!inbandEventFound) {
            return Q.when(data);
        }
        var length = data.length, i = 0, j = 0, identifier, size, expTwo = Math.pow(256, 2), expThree = Math.pow(256, 3), modData = new Uint8Array(data.length);
        while (i < length) {
            identifier = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
            size = data[i] * expThree + data[i + 1] * expTwo + data[i + 2] * 256 + data[i + 3] * 1;
            if (identifier != "emsg") {
                for (var l = i; l < i + size; l++) {
                    modData[j] = data[l];
                    j += 1;
                }
            }
            i += size;
        }
        return Q.when(modData.subarray(0, j));
    }, isRunning = function() {
        var self = this;
        if (started) {
            return true;
        }
        if (deferredFragmentBuffered !== null) {
            signalSegmentBuffered.call(self);
        }
        return false;
    }, signalSegmentBuffered = function() {
        var self = this;
        if (deferredFragmentBuffered) {
            self.debug.info("[BufferController][" + type + "] ### signalSegmentBuffered (resolve deferredFragmentBuffered)");
            deferredFragmentBuffered.resolve();
            deferredFragmentBuffered = null;
        }
    }, hasEnoughSpaceToAppend = function() {
        var self = this, deferred = Q.defer(), removedTime = 0, startClearing;
        if (!isQuotaExceeded) {
            return Q.when(true);
        }
        startClearing = function() {
            var self = this, currentTime = self.videoModel.getCurrentTime(), removeStart = 0, removeEnd, req;
            req = self.fragmentController.getExecutedRequestForTime(fragmentModel, currentTime);
            removeEnd = req && !isNaN(req.startTime) ? req.startTime : Math.floor(currentTime);
            fragmentDuration = req && !isNaN(req.duration) ? req.duration : 1;
            removeBuffer.call(self, removeStart, removeEnd).then(function(removedTimeValue) {
                removedTime += removedTimeValue;
                if (removedTime >= fragmentDuration) {
                    deferred.resolve();
                } else {
                    setTimeout(startClearing, fragmentDuration * 1e3);
                }
            });
        };
        startClearing.call(self);
        return deferred.promise;
    }, removeBuffer = function(start, end) {
        var self = this, deferred = Q.defer(), removeStart, removeEnd;
        if (buffer.buffered.length === 0) {
            deferred.resolve(0);
            return deferred.promise;
        }
        removeStart = start !== undefined && start !== -1 ? start : buffer.buffered.start(0);
        removeEnd = end !== undefined && end !== -1 ? end : buffer.buffered.end(buffer.buffered.length - 1);
        if (removeEnd <= removeStart) {
            deferred.resolve(0);
            return deferred.promise;
        }
        self.debug.info("[BufferController][" + type + "] ### Remove from " + removeStart + " to " + removeEnd + " (" + self.getVideoModel().getCurrentTime() + ")");
        self.sourceBufferExt.waitForUpdateEnd(buffer).then(self.sourceBufferExt.remove(buffer, removeStart, removeEnd, periodInfo.duration, mediaSource, appendSync)).then(function() {
            self.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, removeEnd);
            deferred.resolve(removeEnd - removeStart);
        });
        return deferred.promise;
    }, onBytesError = function(e) {
        if (this.ChunkMissingState === false) {
            if (e.quality !== 0) {
                currentRepresentation = getRepresentationForQuality.call(this, 0);
                if (currentRepresentation !== undefined || currentRepresentation !== null) {
                    loadNextFragment.call(this);
                }
            }
        }
        this.debug.log(type + ": Failed to load a request at startTime = " + e.startTime);
        this.stallTime = e.startTime;
        this.ChunkMissingState = true;
        this.errHandler.downloadError("chunk", e.url, e);
    }, signalStreamComplete = function() {
        var self = this;
        self.debug.log("[BufferController][" + type + "] Stream is complete.");
        isBufferingCompleted = true;
        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
        signalSegmentBuffered.call(self);
        doStop.call(self);
        self.system.notify("bufferingCompleted");
    }, loadInitialization = function() {
        var deferred = Q.defer(), self = this;
        if (initializationData[currentQuality]) {
            self.debug.info("[BufferController][" + type + "] ### Buffer initialization segment, quality = ", currentQuality);
            appendToBuffer.call(this, initializationData[currentQuality], currentQuality).then(function() {
                self.debug.log("[BufferController][" + type + "] ### Initialization segment buffered");
                loadNextFragment.call(self);
            });
            deferred.resolve(null);
        } else {
            this.indexHandler.getInitRequest(availableRepresentations[currentQuality]).then(function(request) {
                deferred.resolve(request);
            });
        }
        return deferred.promise;
    }, loadNextFragment = function() {
        var self = this;
        if (!isRunning.call(self)) {
            return;
        }
        var time = seeking ? seekTarget : currentSegmentTime;
        var range = self.sourceBufferExt.getBufferRange(buffer, time);
        var segmentTime = range ? range.end : time;
        if (seeking === true) {
            seeking = false;
        }
        if (currentSequenceNumber !== -1) {
            self.debug.log("[BufferController][" + type + "] loadNextFragment for sequence number: " + currentSequenceNumber);
            self.indexHandler.getNextSegmentRequestFromSN(currentRepresentation, currentSequenceNumber).then(onFragmentRequest.bind(self));
        } else {
            self.debug.log("[BufferController][" + type + "] loadNextFragment for time: " + segmentTime);
            self.indexHandler.getSegmentRequestForTime(currentRepresentation, segmentTime).then(onFragmentRequest.bind(self));
        }
    }, onFragmentRequest = function(request) {
        var self = this, manifest = self.manifestModel.getValue();
        if (request !== null && request.action === request.ACTION_COMPLETE) {
            signalStreamComplete.call(self);
            return;
        }
        if (request !== null) {
            if (self.fragmentController.isFragmentLoadedOrPending(self, request)) {
                self.debug.log("[BufferController][" + type + "] new fragment request => already loaded or pending");
                self.indexHandler.getNextSegmentRequest(currentRepresentation).then(onFragmentRequest.bind(self));
            } else {
                currentSegmentTime = request.startTime;
                if (request.sequenceNumber) {
                    currentSequenceNumber = request.sequenceNumber;
                }
                self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, null).then(function() {
                    sendRequest.call(self);
                });
            }
        } else {
            self.debug.log("[BufferController][" + type + "] loadNextFragment failed");
            if (manifest.name === "M3U" && isDynamic) {
                updatePlayListForRepresentation.call(self, currentQuality).then(function() {
                    currentRepresentation = getRepresentationForQuality.call(self, currentQuality);
                    updateCheckBufferTimeout.call(self, 0);
                });
            } else {
                updateCheckBufferTimeout.call(self, 0);
            }
        }
    }, hasData = function() {
        return !!data && !!buffer;
    }, getTimeToEnd = function() {
        var currentTime = this.videoModel.getCurrentTime();
        return periodInfo.start + periodInfo.duration - currentTime;
    }, getWorkingTime = function() {
        var time = -1;
        time = this.videoModel.getCurrentTime();
        return time;
    }, getLiveEdgeTime = function() {
        var self = this, deferred = Q.defer();
        var liveEdgeTime = currentRepresentation.segmentAvailabilityRange.end;
        self.debug.log("[BufferController][" + type + "] Manifest live edge = " + liveEdgeTime);
        var startTime = Math.max(liveEdgeTime - minBufferTime, currentRepresentation.segmentAvailabilityRange.start);
        this.indexHandler.getSegmentRequestForTime(currentRepresentation, startTime).then(function(request) {
            periodInfo.liveEdge = request.startTime;
            self.debug.log("[BufferController][" + type + "] Live edge = " + periodInfo.liveEdge);
            deferred.resolve(periodInfo.liveEdge);
        });
        return deferred.promise;
    }, updateBufferLevel = function() {
        if (!hasData()) return;
        var self = this, currentTime = getWorkingTime.call(self);
        bufferLevel = self.sourceBufferExt.getBufferLength(buffer, currentTime);
        self.debug.log("[BufferController][" + type + "] Buffer level = " + bufferLevel);
        self.metricsModel.addBufferLevel(type, new Date(), bufferLevel);
    }, checkIfSufficientBuffer = function() {
        var self = this;
        if (!isRunning.call(self)) {
            return;
        }
        self.debug.log("[BufferController][" + type + "] Check buffer...");
        updateBufferLevel.call(self);
        if (stalled) {
            if (bufferLevel > minBufferTimeAtStartup) {
                setStalled.call(self, false);
            }
        }
        var timeToEnd = getTimeToEnd.call(self);
        self.debug.log("[BufferController][" + type + "] time to end = " + timeToEnd);
        if (bufferLevel < minBufferTime && (minBufferTime < timeToEnd || minBufferTime >= timeToEnd && !isBufferingCompleted)) {
            bufferFragment.call(self);
            lastBufferLevel = bufferLevel;
        } else {
            var delay = bufferLevel - minBufferTime;
            self.debug.log("[BufferController][" + type + "] Check buffer in " + delay + " seconds");
            updateCheckBufferTimeout.call(self, delay);
        }
    }, updateCheckBufferTimeout = function(delay) {
        var self = this;
        clearTimeout(bufferTimeout);
        bufferTimeout = setTimeout(function() {
            checkIfSufficientBuffer.call(self);
        }, Math.max(delay * 1e3, 2e3));
    }, bufferFragment = function() {
        var self = this, now = new Date(), currentVideoTime = self.videoModel.getCurrentTime(), manifest = self.manifestModel.getValue(), quality, playlistUpdated = null;
        deferredFragmentBuffered = Q.defer();
        doUpdateData.call(self).then(function(dataUpdated) {
            var loadInit = dataUpdated;
            self.abrController.getPlaybackQuality(type, data).then(function(result) {
                quality = result.quality;
                currentRepresentation = getRepresentationForQuality.call(self, quality);
                if (quality !== currentQuality) {
                    self.debug.log("[BufferController][" + type + "] Quality changed: " + quality);
                    currentQuality = quality;
                    loadInit = true;
                    currentRepresentation.segments = null;
                    clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                    self.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, currentRepresentation.id);
                    if (manifest.name === "M3U" && isDynamic) {
                        playlistUpdated = Q.defer();
                        updatePlayListForRepresentation.call(self, currentQuality).then(function() {
                            currentRepresentation = getRepresentationForQuality.call(self, quality);
                            playlistUpdated.resolve();
                        });
                    }
                }
                Q.when(playlistUpdated ? playlistUpdated.promise : true).then(function() {
                    if (loadInit === true) {
                        loadInitialization.call(self).then(function(request) {
                            if (request !== null) {
                                self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, null).then(function() {
                                    sendRequest.call(self);
                                });
                            }
                        });
                    } else {
                        loadNextFragment.call(self);
                    }
                });
            });
        });
    }, updatePlayListForRepresentation = function(repIndex) {
        var self = this, deferred = Q.defer(), manifest = self.manifestModel.getValue(), representation;
        self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(function(idx) {
            representation = manifest.Period_asArray[periodInfo.index].AdaptationSet_asArray[idx].Representation_asArray[repIndex];
            self.parser.hlsParser.updatePlaylist(representation).then(function() {
                updateRepresentations.call(self, data, periodInfo).then(function(representations) {
                    availableRepresentations = representations;
                    deferred.resolve();
                });
            });
        });
        return deferred.promise;
    }, updateRepresentations = function(data, periodInfo) {
        var self = this, deferred = Q.defer(), manifest = self.manifestModel.getValue();
        self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(function(idx) {
            self.manifestExt.getAdaptationsForPeriod(manifest, periodInfo).then(function(adaptations) {
                self.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[idx]).then(function(representations) {
                    deferred.resolve(representations);
                });
            });
        });
        return deferred.promise;
    }, doUpdateData = function() {
        var self = this, deferred = Q.defer();
        if (dataChanged === false) {
            deferred.resolve(false);
            return deferred.promise;
        }
        self.debug.log("[BufferController][" + type + "] updateData");
        initializationData = [];
        updateRepresentations.call(self, data, periodInfo).then(function(representations) {
            availableRepresentations = representations;
            self.bufferExt.updateData(data, type);
            dataChanged = false;
            deferred.resolve(true);
        });
        return deferred.promise;
    };
    return {
        videoModel: undefined,
        metricsModel: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        abrController: undefined,
        parser: undefined,
        fragmentExt: undefined,
        indexHandler: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,
        scheduleWhilePaused: undefined,
        eventController: undefined,
        config: undefined,
        BUFFERING: 0,
        PLAYING: 1,
        stallTime: null,
        ChunkMissingState: false,
        initialize: function(type, newPeriodInfo, newData, buffer, videoModel, scheduler, fragmentController, source, eventController) {
            var self = this, manifest = self.manifestModel.getValue();
            self.debug.log("[BufferController][" + type + "] Initialize");
            if (navigator.userAgent.indexOf("Espial") !== -1) {
                appendSync = true;
            }
            isDynamic = self.manifestExt.getIsDynamic(manifest);
            self.setMediaSource(source);
            self.setVideoModel(videoModel);
            self.setType(type);
            self.setBuffer(buffer);
            self.setScheduler(scheduler);
            self.setFragmentController(fragmentController);
            self.setEventController(eventController);
            minBufferTime = self.config.getParamFor(type, "BufferController.minBufferTime", "number", -1);
            minBufferTimeAtStartup = self.config.getParamFor(type, "BufferController.minBufferTimeForPlaying", "number", 2);
            data = newData;
            periodInfo = newPeriodInfo;
            dataChanged = true;
            doUpdateData.call(this).then(function() {
                self.abrController.getPlaybackQuality(type, data).then(function(result) {
                    initialQuality = result.quality;
                    currentRepresentation = getRepresentationForQuality.call(self, result.quality);
                    fragmentDuration = currentRepresentation.segmentDuration;
                    self.indexHandler.setIsDynamic(isDynamic);
                    self.bufferExt.decideBufferLength(manifest.minBufferTime, periodInfo.duration, waitingForBuffer).then(function(time) {
                        minBufferTime = minBufferTime === -1 ? time : minBufferTime;
                    });
                    if (isDynamic) {
                        if (type === "video") {
                            self.indexHandler.updateSegmentList(currentRepresentation).then(function() {
                                getLiveEdgeTime.call(self).then(function(time) {
                                    self.system.notify("liveEdgeFound", time);
                                });
                            });
                        }
                    } else {
                        self.indexHandler.getCurrentTime(currentRepresentation).then(function(time) {
                            self.seek(time);
                        });
                    }
                });
            });
            ready = true;
        },
        getType: function() {
            return type;
        },
        setType: function(value) {
            type = value;
            if (this.indexHandler !== undefined) {
                this.indexHandler.setType(value);
            }
        },
        getPeriodInfo: function() {
            return periodInfo;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        getScheduler: function() {
            return this.requestScheduler;
        },
        setScheduler: function(value) {
            this.requestScheduler = value;
        },
        getFragmentController: function() {
            return this.fragmentController;
        },
        setFragmentController: function(value) {
            this.fragmentController = value;
            fragmentModel = this.fragmentController.attachBufferController(this);
        },
        setEventController: function(value) {
            this.eventController = value;
        },
        getAutoSwitchBitrate: function() {
            var self = this;
            return self.abrController.getAutoSwitchBitrate();
        },
        setAutoSwitchBitrate: function(value) {
            this.abrController.setAutoSwitchBitrate(value);
        },
        getData: function() {
            return data;
        },
        updateData: function(newData, newPeriodInfo) {
            var self = this, deferred = Q.defer(), languageChanged = data && data.lang !== newData.lang ? true : false;
            self.debug.log("[BufferController][" + type + "] ### Update data");
            data = newData;
            periodInfo = newPeriodInfo;
            dataChanged = true;
            if (languageChanged) {
                self.debug.log("[BufferController][" + type + "] ### Language changed");
                self.fragmentController.cancelPendingRequestsForModel(fragmentModel);
                self.fragmentController.abortRequestsForModel(fragmentModel);
                var currentTime = self.getVideoModel().getCurrentTime();
                var seekTime = currentTime + 3;
                removeBuffer.call(self, -1, currentTime).then(function() {
                    removeBuffer.call(self, seekTime).then(function() {
                        debugBufferRange.call(self);
                        doSeek.call(self, seekTime);
                        deferred.resolve();
                    });
                });
            } else {
                deferred.resolve();
            }
            return deferred.promise;
        },
        getCurrentRepresentation: function() {
            return currentRepresentation;
        },
        getBuffer: function() {
            return buffer;
        },
        setBuffer: function(value) {
            buffer = value;
        },
        getMinBufferTime: function() {
            return minBufferTime;
        },
        setMinBufferTime: function(value) {
            minBufferTime = value;
        },
        setMediaSource: function(value) {
            mediaSource = value;
        },
        isReady: function() {
            return state === READY;
        },
        isBufferingCompleted: function() {
            return isBufferingCompleted;
        },
        clearMetrics: function() {
            if (type === null || type === "") {
                return;
            }
            this.metricsModel.clearCurrentMetricsForType(type);
        },
        updateManifest: function() {
            this.system.notify("reloadManifest");
        },
        updateBufferState: function() {
            if (bufferLevel <= 0 && htmlVideoState !== this.BUFFERING && this.videoModel.isSeeking() !== true) {
                htmlVideoState = this.BUFFERING;
                this.debug.log("[BufferController][" + type + "] BUFFERING - " + this.videoModel.getCurrentTime());
                this.metricsModel.addState(type, "buffering", this.videoModel.getCurrentTime());
                if (this.stallTime !== null && this.ChunkMissingState === true) {
                    if (isDynamic) {
                        this.stallTime = null;
                        setTimeout(this.updateManifest.bind(this), currentRepresentation.segments[currentRepresentation.segments.length - 1].duration * 1e3);
                    } else {
                        doStop.call(this);
                        var seekValue = this.stallTime + currentRepresentation.segments[currentRepresentation.segments.length - 1].duration;
                        doSeek.call(this, seekValue);
                        this.videoModel.setCurrentTime(seekValue);
                        this.stallTime = null;
                    }
                }
            } else if (bufferLevel > 0 && htmlVideoState !== this.PLAYING) {
                htmlVideoState = this.PLAYING;
                this.debug.log("[BufferController][" + type + "] PLAYING - " + this.videoModel.getCurrentTime());
                this.metricsModel.addState(type, "playing", this.videoModel.getCurrentTime());
            }
            if (isQuotaExceeded && rejectedBytes && !appendingRejectedData) {
                appendingRejectedData = true;
                appendToBuffer.call(this, rejectedBytes.data, rejectedBytes.quality, rejectedBytes.index).then(function() {
                    appendingRejectedData = false;
                });
            } else {
                updateBufferLevel.call(this);
            }
        },
        updateStalledState: function() {
            stalled = this.videoModel.isStalled();
        },
        reset: function(errored) {
            var self = this, cancel = function cancelDeferred(d) {
                if (d) {
                    d.reject();
                    d = null;
                }
            };
            doStop.call(self);
            cancel(deferredRejectedDataAppend);
            cancel(deferredBuffersFlatten);
            cancel(deferredFragmentBuffered);
            deferredAppends.forEach(cancel);
            deferredAppends = [];
            cancel(deferredStreamComplete);
            deferredStreamComplete = Q.defer();
            self.clearMetrics();
            self.fragmentController.abortRequestsForModel(fragmentModel);
            self.fragmentController.detachBufferController(fragmentModel);
            fragmentModel = null;
            initializationData = [];
            initialPlayback = true;
            isQuotaExceeded = false;
            rejectedBytes = null;
            appendingRejectedData = false;
            if (!errored) {
                self.sourceBufferExt.abort(mediaSource, buffer);
                self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }
            data = null;
            buffer = null;
        },
        start: doStart,
        seek: doSeek,
        stop: doStop
    };
};

Custom.dependencies.CustomBufferController.prototype = {
    constructor: Custom.dependencies.CustomBufferController
};

Custom.dependencies.CustomFragmentLoader = function() {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.FragmentLoader);
    var RETRY_ATTEMPTS = 3, RETRY_INTERVAL = 500, BYTESLENGTH = false, retryCount = 0, xhrs = [];
    rslt.doLoad = function(request, bytesRange) {
        var d = Q.defer();
        var req = new XMLHttpRequest(), httpRequestMetrics = null, firstProgress = true, needFailureReport = true, lastTraceTime = null, self = this;
        xhrs.push(req);
        request.requestStartDate = new Date();
        httpRequestMetrics = self.metricsModel.addHttpRequest(request.streamType, null, request.type, request.url, null, request.range, request.requestStartDate, null, null, null, null, request.duration, request.startTime, request.quality);
        self.metricsModel.appendHttpTrace(httpRequestMetrics, request.requestStartDate, request.requestStartDate.getTime() - request.requestStartDate.getTime(), [ 0 ]);
        lastTraceTime = request.requestStartDate;
        req.open("GET", self.tokenAuthentication.addTokenAsQueryArg(request.url), true);
        req.responseType = "arraybuffer";
        req = self.tokenAuthentication.setTokenInRequestHeader(req);
        if (bytesRange) {
            req.setRequestHeader("Range", bytesRange);
        }
        req.onprogress = function(event) {
            var currentTime = new Date();
            if (firstProgress) {
                firstProgress = false;
                if (!event.lengthComputable || event.lengthComputable && event.total != event.loaded) {
                    request.firstByteDate = currentTime;
                    httpRequestMetrics.tresponse = currentTime;
                }
            }
            self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ req.response ? req.response.byteLength : 0 ]);
            lastTraceTime = currentTime;
        };
        req.onload = function() {
            if (req.status < 200 || req.status > 299) {
                return;
            }
            needFailureReport = false;
            var currentTime = new Date(), bytes = req.response, latency, download;
            if (!request.firstByteDate) {
                request.firstByteDate = request.requestStartDate;
            }
            request.requestEndDate = currentTime;
            latency = request.firstByteDate.getTime() - request.requestStartDate.getTime();
            download = request.requestEndDate.getTime() - request.firstByteDate.getTime();
            self.debug.log("[FragmentLoader][" + request.streamType + "] Loaded: " + request.url + " (" + req.status + ", " + latency + "ms, " + download + "ms)");
            httpRequestMetrics.tresponse = request.firstByteDate;
            httpRequestMetrics.tfinish = request.requestEndDate;
            httpRequestMetrics.responsecode = req.status;
            httpRequestMetrics.bytesLength = bytes ? bytes.byteLength : 0;
            self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ bytes ? bytes.byteLength : 0 ]);
            lastTraceTime = currentTime;
            d.resolve({
                data: bytes,
                request: request
            });
        };
        req.onloadend = req.onerror = function() {
            if (xhrs.indexOf(req) === -1) {
                return;
            } else {
                xhrs.splice(xhrs.indexOf(req), 1);
            }
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;
            var currentTime = new Date(), bytes = req.response, latency, download;
            if (!request.firstByteDate) {
                request.firstByteDate = request.requestStartDate;
            }
            request.requestEndDate = currentTime;
            latency = request.firstByteDate.getTime() - request.requestStartDate.getTime();
            download = request.requestEndDate.getTime() - request.firstByteDate.getTime();
            httpRequestMetrics.tresponse = request.firstByteDate;
            httpRequestMetrics.tfinish = request.requestEndDate;
            httpRequestMetrics.responsecode = req.status;
            self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ bytes ? bytes.byteLength : 0 ]);
            lastTraceTime = currentTime;
            d.reject(req);
        };
        self.debug.log("[FragmentLoader][" + request.streamType + "] Load: " + request.url);
        req.send();
        return d.promise;
    };
    rslt.getBytesLength = function(request) {
        var d = Q.defer();
        var http = new XMLHttpRequest();
        http.open("HEAD", request.url);
        http.onreadystatechange = function() {
            if (http.status < 200 || http.status > 299) {
                d.reject();
            } else {
                if (http.getResponseHeader("Content-Length")) {
                    d.resolve(http.getResponseHeader("Content-Length"));
                } else {
                    d.reject();
                }
            }
        };
        http.send();
        return d.promise;
    };
    rslt.planRequests = function(req) {
        if (!req) {
            return Q.when(null);
        }
        var that = this;
        var d = Q.defer();
        if (BYTESLENGTH) {
            this.getBytesLength(req).then(function(bytesLength) {
                BYTESLENGTH = true;
                that.loadRequests(bytesLength, req).then(function(datas) {
                    var buffer1 = datas[0].data, buffer2 = datas[1].data, tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
                    tmp.set(new Uint8Array(buffer1), 0);
                    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
                    d.resolve({
                        data: tmp.buffer,
                        request: req
                    });
                });
            }, function() {
                BYTESLENGTH = false;
                d.resolve(that.doLoad(req, RETRY_ATTEMPTS));
            });
        } else {
            that.doLoad(req).then(function(result) {
                d.resolve(result);
            }, function() {
                that.retry(req, d, that);
            });
        }
        return d.promise;
    };
    rslt.retry = function(request, d, that) {
        setTimeout(function() {
            that.doLoad(request).then(function(result) {
                retryCount = 0;
                d.resolve(result);
            }, function(error) {
                retryCount++;
                if (retryCount < RETRY_ATTEMPTS) {
                    that.retry(request, d, that);
                } else {
                    retryCount = 0;
                    d.reject(error);
                }
            });
        }, RETRY_INTERVAL);
    };
    rslt.loadRequests = function(bytesLength, req) {
        var halfBytes = Math.floor(bytesLength / 2), bytesFirstHalf = "bytes=0-" + (halfBytes - 1), bytesSecondHalf = "bytes=" + halfBytes + "-" + bytesLength;
        return Q.all([ this.doLoad(req, RETRY_ATTEMPTS, bytesFirstHalf), this.doLoad(req, RETRY_ATTEMPTS, bytesSecondHalf) ]);
    };
    rslt.load = function(req) {
        var deferred = Q.defer();
        if (req.type == "Initialization Segment" && req.data) {
            deferred.resolve(req, {
                data: req.data
            });
        } else {
            this.planRequests(req).then(function(result) {
                deferred.resolve(result);
            }, function(error) {
                deferred.reject(error);
            });
        }
        return deferred.promise;
    };
    return rslt;
};

Custom.dependencies.CustomFragmentLoader.prototype = {
    constructor: Custom.dependencies.CustomFragmentLoader
};

Custom.dependencies.CustomMetricsExtensions = function() {
    "use strict";
    var h264ProfileMap = {
        "42": "Baseline",
        "4D": "Main",
        "58": "Extended",
        "64": "High"
    };
    var findRepresentionInPeriodArray = function(periodArray, representationId) {
        var period, adaptationSet, adaptationSetArray, representation, representationArray, periodArrayIndex, adaptationSetArrayIndex, representationArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
            period = periodArray[periodArrayIndex];
            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                for (representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex = representationArrayIndex + 1) {
                    representation = representationArray[representationArrayIndex];
                    if (representationId === representation.id) {
                        return representation;
                    }
                }
            }
        }
        return null;
    };
    var adaptationIsType = function(adaptation, bufferType) {
        var found = false;
        if (bufferType === "video") {
            this.manifestExt.getIsVideo(adaptation);
            if (adaptation.type === "video") {
                found = true;
            }
        } else if (bufferType === "audio") {
            this.manifestExt.getIsAudio(adaptation);
            if (adaptation.type === "audio") {
                found = true;
            }
        } else {
            found = false;
        }
        return found;
    };
    var rslt = Custom.utils.copyMethods(Dash.dependencies.DashMetricsExtensions);
    rslt.getDuration = function() {
        var self = this, manifest = self.manifestModel.getValue();
        var duration = manifest.Period.duration;
        if (duration !== Infinity) {
            return duration;
        }
        return -1;
    };
    rslt.getFormatForType = function(type) {
        var self = this, manifest = self.manifestModel.getValue();
        for (var i = 0; i < manifest.Period.AdaptationSet.length; i++) {
            var adaptation = manifest.Period.AdaptationSet[i];
            if (adaptation.type === type) {
                return adaptation.mimeType;
            }
        }
        return null;
    };
    rslt.getCodecForType = function(type) {
        var self = this, manifest = self.manifestModel.getValue();
        for (var i = 0; i < manifest.Period.AdaptationSet.length; i++) {
            var adaptation = manifest.Period.AdaptationSet[i];
            if (adaptation.type === type || adaptation.contentType === type) {
                return adaptation.Representation[0].codecs;
            }
        }
        return null;
    };
    rslt.getVideoWidthForRepresentation = function(representationId) {
        var self = this, manifest = self.manifestModel.getValue(), representation, periodArray = manifest.Period_asArray;
        representation = findRepresentionInPeriodArray.call(self, periodArray, representationId);
        if (representation === null) {
            return null;
        }
        return representation.width;
    };
    rslt.getVideoHeightForRepresentation = function(representationId) {
        var self = this, manifest = self.manifestModel.getValue(), representation, periodArray = manifest.Period_asArray;
        representation = findRepresentionInPeriodArray.call(self, periodArray, representationId);
        if (representation === null) {
            return null;
        }
        return representation.height;
    };
    rslt.getCodecsForRepresentation = function(representationId) {
        var self = this, manifest = self.manifestModel.getValue(), representation, periodArray = manifest.Period_asArray;
        representation = findRepresentionInPeriodArray.call(self, periodArray, representationId);
        if (representation === null) {
            return null;
        }
        return representation.codecs;
    };
    rslt.getH264ProfileLevel = function(codecs) {
        if (codecs.indexOf("avc1") < 0) {
            return "";
        }
        var profile = h264ProfileMap[codecs.substr(5, 2)];
        var level = parseInt(codecs.substr(9, 2), 16) / 10;
        return profile + "@" + level.toString();
    };
    rslt.getBitratesForType = function(type) {
        var self = this, manifest = self.manifestModel.getValue(), periodArray, period, periodArrayIndex, adaptationSet, adaptationSetArray, representation, representationArray, adaptationSetArrayIndex, representationArrayIndex, bitrateArray = [];
        if (manifest === null || manifest === undefined) {
            return null;
        }
        periodArray = manifest.Period_asArray;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
            period = periodArray[periodArrayIndex];
            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                if (adaptationIsType.call(self, adaptationSet, type)) {
                    representationArray = adaptationSet.Representation_asArray;
                    for (representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex = representationArrayIndex + 1) {
                        representation = representationArray[representationArrayIndex];
                        bitrateArray.push(representation.bandwidth);
                    }
                    return bitrateArray;
                }
            }
        }
        return bitrateArray;
    };
    rslt.getCurrentRepresentationBoundaries = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var repBoundaries = metrics.RepBoundariesList;
        if (repBoundaries === null || repBoundaries.length <= 0) {
            return null;
        }
        return repBoundaries[repBoundaries.length - 1];
    };
    rslt.getCurrentBandwidthBoundaries = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var bandwidthBoundaries = metrics.BandwidthBoundariesList;
        if (bandwidthBoundaries === null || bandwidthBoundaries.length <= 0) {
            return null;
        }
        return bandwidthBoundaries[bandwidthBoundaries.length - 1];
    };
    return rslt;
};

Custom.dependencies.CustomMetricsExtensions.prototype = {
    constructor: Custom.dependencies.CustomMetricsExtensions
};

Custom.dependencies.CustomParser = function() {
    "use strict";
    var customParse = function(data, baseUrl) {
        var parser = null;
        if (data.indexOf("SmoothStreamingMedia") > -1) {
            this.system.notify("setContext", "MSS");
            parser = this.mssParser;
        } else if (data.indexOf("#EXTM3U") > -1) {
            this.system.notify("setContext", "HLS");
            parser = this.hlsParser;
        } else if (data.indexOf("MPD") > -1) {
            this.system.notify("setContext", "MPD");
            parser = this.dashParser;
        } else {
            console.error("manifest cannot be parse, type is unknown !");
            return Q.when(null);
        }
        return parser.parse(data, baseUrl);
    };
    return {
        debug: undefined,
        system: undefined,
        dashParser: undefined,
        mssParser: undefined,
        hlsParser: undefined,
        metricsModel: undefined,
        parse: customParse
    };
};

Custom.dependencies.CustomParser.prototype = {
    constructor: Custom.dependencies.CustomParser
};

Custom.dependencies.CustomSourceBufferExtensions = function() {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.SourceBufferExtensions);
    rslt.getBufferRange = function(buffer, time, tolerance) {
        var ranges = null, start = 0, end = 0, firstStart = null, lastEnd = null, gap = 0, toler = tolerance || .15, len, i;
        try {
            ranges = buffer.buffered;
        } catch (ex) {
            return null;
        }
        if (ranges !== null) {
            for (i = 0, len = ranges.length; i < len; i += 1) {
                start = ranges.start(i);
                end = ranges.end(i);
                if (firstStart === null) {
                    gap = Math.abs(start - time);
                    if (time >= start && time < end) {
                        firstStart = start;
                        lastEnd = end;
                        continue;
                    } else if (gap <= toler) {
                        firstStart = start;
                        lastEnd = end;
                        continue;
                    }
                } else {
                    gap = start - lastEnd;
                    if (gap <= toler) {
                        lastEnd = end;
                    } else {
                        break;
                    }
                }
            }
            if (firstStart !== null) {
                return {
                    start: firstStart,
                    end: lastEnd
                };
            }
        }
        return null;
    };
    rslt.getAllRanges = function(buffer) {
        var ranges = null;
        try {
            ranges = buffer.buffered;
            return ranges;
        } catch (ex) {
            return null;
        }
    };
    rslt.getBufferLength = function(buffer, time, tolerance) {
        var self = this, range, length;
        range = self.getBufferRange(buffer, time, tolerance);
        if (range === null) {
            length = 0;
        } else {
            length = range.end - time;
        }
        return length;
    };
    rslt.createSourceBuffer = function(mediaSource, codec) {
        var deferred = Q.defer(), self = this;
        try {
            deferred.resolve(mediaSource.addSourceBuffer(codec));
        } catch (ex) {
            if (!self.manifestExt.getIsTextTrack(codec)) {
                deferred.reject(ex.description);
            } else {
                if (codec === "text/vtt" || codec === "text/ttml") {
                    deferred.resolve(self.system.getObject("textSourceBuffer"));
                } else {
                    if (codec === "application/ttml+xml+mp4") {
                        deferred.resolve(self.system.getObject("textTTMLXMLMP4SourceBuffer"));
                    } else {
                        deferred.reject();
                    }
                }
            }
        }
        return deferred.promise;
    };
    return rslt;
};

Custom.dependencies.CustomSourceBufferExtensions.prototype = {
    constructor: Custom.dependencies.CustomSourceBufferExtensions
};

Custom.di.CustomContext = function() {
    "use strict";
    return {
        system: undefined,
        setup: function() {
            Custom.di.CustomContext.prototype.setup.call(this);
            this.system.mapClass("parser", Custom.dependencies.CustomParser);
            this.system.mapClass("dashParser", Dash.dependencies.DashParser);
            this.system.mapClass("mssParser", Mss.dependencies.MssParser);
            this.system.mapClass("hlsParser", Hls.dependencies.HlsParser);
            this.system.mapClass("hlsDemux", Hls.dependencies.HlsDemux);
            this.system.mapSingleton("contextManager", Custom.modules.ContextManager);
            this.system.mapClass("fragmentLoader", Custom.dependencies.CustomFragmentLoader);
            this.system.mapSingleton("metricsModel", Custom.models.CustomMetricsModel);
            this.system.mapSingleton("metricsExt", Custom.dependencies.CustomMetricsExtensions);
            this.system.mapClass("metrics", Custom.models.CustomMetricsList);
            this.system.mapSingleton("abrController", Custom.dependencies.CustomAbrController);
            this.system.mapClass("bufferController", Custom.dependencies.CustomBufferController);
            this.system.mapSingleton("sourceBufferExt", Custom.dependencies.CustomSourceBufferExtensions);
            this.system.mapSingleton("debug", Custom.utils.CustomDebug);
            this.system.mapSingleton("config", MediaPlayer.utils.Config);
            this.system.mapClass("downloadRatioRule", Custom.rules.CustomDownloadRatioRule);
            this.system.mapClass("insufficientBufferRule", Custom.rules.CustomInsufficientBufferRule);
            this.system.mapHandler("setContext", "contextManager", "setContext");
            this.system.mapSingleton("adapter", Dash.dependencies.DashAdapter);
        }
    };
};

Custom.di.CustomContext.prototype = new Dash.di.DashContext();

Custom.di.CustomContext.prototype.constructor = Custom.di.CustomContext;

Custom.models.CustomMetricsList = function() {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.models.MetricsList);
    rslt.RepBoundariesList = [];
    rslt.BandwidthBoundariesList = [];
    return rslt;
};

Custom.models.CustomMetricsList.prototype = {
    constructor: Custom.models.CustomMetricsList
};

Custom.models.CustomMetricsModel = function() {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.models.MetricsModel);
    rslt.addRepresentationBoundaries = function(streamType, t, min, max) {
        var vo = new Custom.vo.metrics.RepresentationBoundaries();
        vo.t = t;
        vo.min = min;
        vo.max = max;
        this.parent.getMetricsFor(streamType).RepBoundariesList.push(vo);
        this.parent.metricAdded(streamType, "RepresentationBoundaries", vo);
        return vo;
    };
    rslt.addBandwidthBoundaries = function(streamType, t, min, max) {
        var vo = new Custom.vo.metrics.BandwidthBoundaries();
        vo.t = t;
        vo.min = min;
        vo.max = max;
        this.parent.getMetricsFor(streamType).BandwidthBoundariesList.push(vo);
        this.parent.metricAdded(streamType, "BandwidthBoundaries", vo);
        return vo;
    };
    rslt.addError = function(streamType, code, message, position) {
        var vo = new Custom.vo.metrics.Error();
        vo.code = code;
        vo.message = message;
        vo.position = position;
        this.parent.metricAdded(streamType, "Error", vo);
        return vo;
    };
    rslt.addState = function(streamType, currentState, position, reason) {
        var vo = new Custom.vo.metrics.State();
        vo.current = currentState;
        vo.position = position;
        vo.reason = reason;
        this.parent.metricAdded(streamType, "State", vo);
        return vo;
    };
    rslt.addSession = function(streamType, url, loop, endTime, playerType) {
        var vo = new Custom.vo.metrics.Session();
        vo.uri = url;
        if (loop) {
            vo.loopMode = 1;
        } else {
            vo.loopMode = 0;
        }
        vo.endTime = endTime;
        vo.playerType = playerType;
        this.parent.metricAdded(streamType, "Session", vo);
        return vo;
    };
    rslt.addCondition = function(streamType, isFullScreen, videoWidth, videoHeight, droppedFrames, fps) {
        var vo = new Custom.vo.metrics.Condition();
        vo.isFullScreen = isFullScreen;
        vo.windowSize = videoWidth + "x" + videoHeight;
        vo.fps = fps;
        vo.droppedFrames = droppedFrames;
        this.parent.metricAdded(streamType, "Condition", vo);
        return vo;
    };
    rslt.addMetaData = function() {
        this.parent.metricAdded(null, "ManifestReady", null);
    };
    rslt.clearAllCurrentMetrics = function() {
        var self = this, streamMetrics = this.parent.streamMetrics;
        for (var prop in streamMetrics) {
            if (streamMetrics.hasOwnProperty(prop)) {
                delete streamMetrics[prop];
            }
        }
        this.metricsChanged.call(self);
    };
    return rslt;
};

Custom.models.CustomMetricsModel.prototype = {
    constructor: Custom.models.CustomMetricsModel
};

Custom.modules.ContextManager = function() {
    "use strict";
    return {
        system: undefined,
        debug: undefined,
        setContext: function(ctx) {
            this.system.autoMapOutlets = true;
            if (ctx === "MSS") {
                this.system.mapClass("mp4Processor", MediaPlayer.dependencies.Mp4Processor);
                this.system.mapClass("indexHandler", Mss.dependencies.MssHandler);
                this.system.mapClass("fragmentController", Mss.dependencies.MssFragmentController);
            } else if (ctx === "HLS") {
                this.system.mapClass("mp4Processor", MediaPlayer.dependencies.Mp4Processor);
                this.system.mapClass("fragmentController", Hls.dependencies.HlsFragmentController);
                this.system.mapClass("indexHandler", Hls.dependencies.HlsHandler);
            } else {
                this.system.mapClass("fragmentController", MediaPlayer.dependencies.FragmentController);
                this.system.mapClass("indexHandler", Dash.dependencies.DashHandler);
            }
        }
    };
};

Custom.modules.ContextManager.prototype = {
    constructor: Custom.modules.ContextManager
};

Custom.rules.CustomDownloadRatioRule = function() {
    "use strict";
    var _mediaDuration = 0, _downloadTime = 0, _totalTime = 0, checkRatio = function(newIdx, currentBandwidth, data) {
        var self = this, deferred = Q.defer();
        self.manifestExt.getRepresentationFor(newIdx, data).then(function(rep) {
            self.manifestExt.getBandwidth(rep).then(function(newBandwidth) {
                deferred.resolve(newBandwidth / currentBandwidth);
            });
        });
        return deferred.promise;
    };
    return {
        debug: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        manifestModel: undefined,
        config: undefined,
        checkIndex: function(current, metrics, data) {
            var self = this, lastRequest = self.metricsExt.getCurrentHttpRequest(metrics), downloadTime, totalTime, ratio, latencyInBandwidth = self.config.getParamFor(data.type, "ABR.latencyInBandwidth", "boolean", true), switchUpRatioSafetyFactor = self.config.getParamFor(data.type, "ABR.switchUpRatioSafetyFactor", "number", 1.5), deferred, funcs, i, q = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
            self.debug.log("[DownloadRatioRule][" + data.type + "] Checking download ratio rule... (current = " + current + ")");
            if (!metrics) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (lastRequest === null) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1e3;
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1e3;
            if (totalTime <= 0) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (lastRequest.mediaduration === null || lastRequest.mediaduration === undefined || lastRequest.mediaduration <= 0 || isNaN(lastRequest.mediaduration)) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            _mediaDuration += lastRequest.mediaduration;
            _downloadTime += downloadTime;
            _totalTime += downloadTime;
            if (_mediaDuration < 4) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            deferred = Q.defer();
            ratio = latencyInBandwidth ? _mediaDuration / _totalTime : _mediaDuration / _downloadTime;
            self.debug.log("[DownloadRatioRule][" + data.type + "] DL: " + _downloadTime + "s, Total: " + _totalTime + "s => ratio: " + ratio);
            _mediaDuration = _downloadTime = _totalTime = 0;
            if (isNaN(ratio)) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (ratio <= 1) {
                self.manifestExt.getRepresentationFor(current, data).then(function(currentRepresentation) {
                    self.manifestExt.getBandwidth(currentRepresentation).then(function(currentBandwidth) {
                        i = 0;
                        funcs = [];
                        while (i <= current) {
                            funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                            i += 1;
                        }
                        Q.all(funcs).then(function(results) {
                            for (i = current - 1; i >= 0; i -= 1) {
                                if (ratio > results[i]) {
                                    break;
                                }
                            }
                            q = i;
                            p = MediaPlayer.rules.SwitchRequest.prototype.WEAK;
                            self.debug.log("[DownloadRatioRule][" + data.type + "] SwitchRequest(" + q + ", " + p + ")");
                            deferred.resolve(new MediaPlayer.rules.SwitchRequest(q, p));
                        });
                    });
                });
            } else if (ratio >= 1) {
                self.manifestExt.getRepresentationCount(data).then(function(max) {
                    max -= 1;
                    self.manifestExt.getRepresentationFor(current, data).then(function(currentRepresentation) {
                        self.manifestExt.getBandwidth(currentRepresentation).then(function(currentBandwidth) {
                            i = 0;
                            funcs = [];
                            while (i <= max) {
                                funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                                i += 1;
                            }
                            Q.all(funcs).then(function(results) {
                                for (i = results.length; i > current; i -= 1) {
                                    if (ratio > results[i] * switchUpRatioSafetyFactor) {
                                        break;
                                    }
                                }
                                q = i;
                                p = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                                self.debug.log("[DownloadRatioRule][" + data.type + "] SwitchRequest(" + q + ", " + p + ")");
                                deferred.resolve(new MediaPlayer.rules.SwitchRequest(q, p));
                            });
                        });
                    });
                });
            }
            return deferred.promise;
        }
    };
};

Custom.rules.CustomDownloadRatioRule.prototype = {
    constructor: Custom.rules.CustomDownloadRatioRule
};

Custom.rules.CustomInsufficientBufferRule = function() {
    "use strict";
    return {
        debug: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        manifestModel: undefined,
        config: undefined,
        checkIndex: function(current, metrics, data) {
            var self = this, bufferLevel = self.metricsExt.getCurrentBufferLevel(metrics), minBufferTime, switchLowerBufferRatio, switchLowerBufferTime, switchDownBufferRatio, switchDownBufferTime, switchUpBufferRatio, switchUpBufferTime, deferred, q = current, p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
            if (bufferLevel === null) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            self.debug.log("[InsufficientBufferRule][" + data.type + "] Checking buffer level ... (current = " + current + ", buffer level = " + bufferLevel.level + ")");
            deferred = Q.defer();
            self.manifestExt.getMpd(self.manifestModel.getValue()).then(function(mpd) {
                minBufferTime = self.config.getParamFor(data.type, "BufferController.minBufferTime", "number", mpd.manifest.minBufferTime);
                switchLowerBufferRatio = self.config.getParamFor(data.type, "ABR.switchLowerBufferRatio", "number", .25);
                switchLowerBufferTime = self.config.getParamFor(data.type, "ABR.switchLowerBufferTime", "number", switchLowerBufferRatio * minBufferTime);
                switchDownBufferRatio = self.config.getParamFor(data.type, "ABR.switchDownBufferRatio", "number", .5);
                switchDownBufferTime = self.config.getParamFor(data.type, "ABR.switchDownBufferTime", "number", switchDownBufferRatio * minBufferTime);
                switchUpBufferRatio = self.config.getParamFor(data.type, "ABR.switchUpBufferRatio", "number", .75);
                switchUpBufferTime = self.config.getParamFor(data.type, "ABR.switchUpBufferTime", "number", switchUpBufferRatio * minBufferTime);
                self.manifestExt.getRepresentationCount(data).then(function(max) {
                    max -= 1;
                    if (bufferLevel.level <= switchLowerBufferTime) {
                        q = 0;
                        p = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                    } else if (bufferLevel.level <= switchDownBufferTime) {
                        q = current > 0 ? current - 1 : 0;
                        p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                    }
                    self.debug.log("[InsufficientBufferRule][" + data.type + "] SwitchRequest(" + q + ", " + p + ")");
                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(q, p));
                });
            });
            return deferred.promise;
        }
    };
};

Custom.rules.CustomInsufficientBufferRule.prototype = {
    constructor: Custom.rules.CustomInsufficientBufferRule
};

Custom.utils.copyMethods = function(clazz) {
    var rslt = new clazz();
    rslt.parent = {};
    for (var key in rslt) {
        rslt.parent[key] = rslt[key];
    }
    rslt.setup = function() {
        for (var att in this.parent) {
            if (this.parent[att] === undefined) {
                this.parent[att] = this[att];
            }
        }
    };
    return rslt;
};

Custom.utils.CustomDebug = function() {
    "use strict";
    var rslt = Custom.utils.copyMethods(MediaPlayer.utils.Debug);
    var showLogTimestamp = true, startTime = new Date().getTime();
    rslt.getLogger = function() {
        var _logger = "undefined" !== typeof log4javascript ? log4javascript.getLogger() : null;
        if (_logger) {
            if (!_logger.initialized) {
                var appender = new log4javascript.PopUpAppender();
                var layout = new log4javascript.PatternLayout("%d{HH:mm:ss.SSS} %-5p - %m%n");
                appender.setLayout(layout);
                _logger.addAppender(appender);
                _logger.setLevel(log4javascript.Level.ALL);
                _logger.initialized = true;
            }
        }
        return _logger;
    };
    rslt.toHHMMSSmmm = function(time) {
        var str, h, m, s, ms = time;
        h = Math.floor(ms / 36e5);
        ms -= h * 36e5;
        m = Math.floor(ms / 6e4);
        ms -= m * 6e4;
        s = Math.floor(ms / 1e3);
        ms -= s * 1e3;
        if (h < 10) {
            h = "0" + h;
        }
        if (m < 10) {
            m = "0" + m;
        }
        if (s < 10) {
            s = "0" + s;
        }
        if (ms < 10) {
            ms = "0" + ms;
        }
        if (ms < 100) {
            ms = "0" + ms;
        }
        str = h + ":" + m + ":" + s + ":" + ms;
        return str;
    };
    rslt._log = function(level, args) {
        if (this.getLogToBrowserConsole() && level <= rslt.getLevel()) {
            var _logger = this.getLogger(), message = "", logTime = null;
            if (_logger === undefined || _logger === null) {
                _logger = console;
            }
            if (showLogTimestamp) {
                logTime = new Date().getTime();
                message += "[" + this.toHHMMSSmmm(logTime - startTime) + "] ";
            }
            Array.apply(null, args).forEach(function(item) {
                message += item + " ";
            });
            switch (level) {
              case this.ERROR:
                _logger.error(message);
                break;

              case this.WARN:
                _logger.warn(message);
                break;

              case this.INFO:
                _logger.info(message);
                break;

              case this.DEBUG:
                _logger.debug(message);
                break;
            }
        }
        this.eventBus.dispatchEvent({
            type: "log",
            message: arguments[0]
        });
    };
    rslt.error = function() {
        this._log(this.ERROR, arguments);
    };
    rslt.warn = function() {
        this._log(this.WARN, arguments);
    };
    rslt.info = function() {
        this._log(this.INFO, arguments);
    };
    rslt.log = function() {
        this._log(this.DEBUG, arguments);
    };
    return rslt;
};

Custom.utils.ObjectIron = function(map) {
    var lookup;
    lookup = [];
    for (var i = 0, len = map.length; i < len; i += 1) {
        if (map[i].isRoot) {
            lookup.push("root");
        } else {
            lookup.push(map[i].name);
        }
    }
    var mergeValues = function(parentItem, childItem) {
        var name;
        if (parentItem === null || childItem === null) {
            return;
        }
        for (name in parentItem) {
            if (parentItem.hasOwnProperty(name)) {
                if (!childItem.hasOwnProperty(name)) {
                    childItem[name] = parentItem[name];
                }
            }
        }
    }, mapProperties = function(properties, parent, child) {
        var i, len, property, parentValue, childValue;
        if (properties === null || properties.length === 0) {
            return;
        }
        for (i = 0, len = properties.length; i < len; i += 1) {
            property = properties[i];
            if (parent.hasOwnProperty(property.name)) {
                if (child.hasOwnProperty(property.name)) {
                    if (property.merge) {
                        parentValue = parent[property.name];
                        childValue = child[property.name];
                        if (typeof parentValue === "object" && typeof childValue === "object") {
                            mergeValues(parentValue, childValue);
                        } else {
                            if (property.mergeFunction !== null) {
                                child[property.name] = property.mergeFunction(parentValue, childValue);
                            } else {
                                child[property.name] = parentValue + childValue;
                            }
                        }
                    }
                } else {
                    child[property.name] = parent[property.name];
                }
            }
        }
    }, mapItem = function(obj, node) {
        var item = obj, i, len, v, len2, array, childItem, childNode;
        if (obj.transformFunc) {
            node = obj.transformFunc(node);
        }
        if (item.children === null || item.children.length === 0) {
            return node;
        }
        for (i = 0, len = item.children.length; i < len; i += 1) {
            childItem = item.children[i];
            var itemMapped = null;
            if (node.hasOwnProperty(childItem.name)) {
                if (childItem.isArray) {
                    array = node[childItem.name + "_asArray"];
                    for (v = 0, len2 = array.length; v < len2; v += 1) {
                        childNode = array[v];
                        mapProperties(item.properties, node, childNode);
                        itemMapped = mapItem(childItem, childNode);
                        node[childItem.name + "_asArray"][v] = itemMapped;
                        node[childItem.name][v] = itemMapped;
                    }
                } else {
                    childNode = node[childItem.name];
                    mapProperties(item.properties, node, childNode);
                    itemMapped = mapItem(childItem, childNode);
                    node[childItem.name] = itemMapped;
                    node[childItem.name + "_asArray"] = [ itemMapped ];
                }
            }
        }
        return node;
    }, performMapping = function(source) {
        var i, len, pi, pp, item, node, array;
        if (source === null) {
            return source;
        }
        if (typeof source !== "object") {
            return source;
        }
        for (i = 0, len = lookup.length; i < len; i += 1) {
            if (lookup[i] === "root") {
                item = map[i];
                node = source;
                source = mapItem(item, node);
            }
        }
        for (pp in source) {
            if (source.hasOwnProperty(pp)) {
                pi = lookup.indexOf(pp);
                if (pi !== -1) {
                    item = map[pi];
                    if (item.isArray) {
                        array = source[pp + "_asArray"];
                        for (i = 0, len = array.length; i < len; i += 1) {
                            node = array[i];
                            source[pp][i] = mapItem(item, node);
                            source[pp + "_asArray"][i] = mapItem(item, node);
                        }
                    } else {
                        node = source[pp];
                        source[pp] = mapItem(item, node);
                        source[pp + "_asArray"] = [ mapItem(item, node) ];
                    }
                }
                source[pp] = performMapping(source[pp]);
            }
        }
        return source;
    };
    return {
        run: performMapping
    };
};

Custom.utils.getXMLHttpRequest = function() {
    var xhr = null;
    if (window.XMLHttpRequest || window.ActiveXObject) {
        try {
            xhr = new XMLHttpRequest();
        } catch (e) {
            try {
                xhr = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }
        }
    } else {
        alert("Votre navigateur ne supporte pas l'objet XMLHTTPRequest...");
        return null;
    }
    return xhr;
};

Custom.utils.doRequestWithPromise = function(url, callback, argumentsToForward) {
    var deferred = Q.defer(), xhr = Custom.utils.getXMLHttpRequest(), self = this;
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
            callback.call(self, deferred, xhr.response, argumentsToForward);
        }
    };
    xhr.open("GET", url, true);
    xhr.send(null);
    return deferred.promise;
};

Custom.vo.metrics.BandwidthBoundaries = function() {
    "use strict";
    this.t = null;
    this.min = null;
    this.max = null;
};

Custom.vo.metrics.BandwidthBoundaries.prototype = {
    constructor: Custom.vo.metrics.BandwidthBoundaries
};

Custom.vo.metrics.Condition = function() {
    "use strict";
    this.isFullScreen = null;
    this.windowSize = null;
    this.droppedFrames = null;
    this.fps = null;
    this.bandwidth = null;
};

Custom.vo.metrics.Condition.prototype = {
    constructor: Custom.vo.metrics.Condition
};

Custom.vo.metrics.Error = function() {
    "use strict";
    this.t = null;
    this.code = null;
    this.message = null;
};

Custom.vo.metrics.Error.prototype = {
    constructor: Custom.vo.metrics.Error
};

Custom.vo.metrics.RepresentationBoundaries = function() {
    "use strict";
    this.t = null;
    this.min = null;
    this.max = null;
};

Custom.vo.metrics.RepresentationBoundaries.prototype = {
    constructor: Custom.vo.metrics.RepresentationBoundaries
};

Custom.vo.metrics.Session = function() {
    "use strict";
    this.uri = null;
    this.loopMode = null;
    this.endTime = null;
    this.playerType = null;
};

Custom.vo.metrics.Session.prototype = {
    constructor: Custom.vo.metrics.Session
};

Custom.vo.metrics.State = function() {
    "use strict";
    this.t = null;
    this.current = null;
    this.position = null;
    this.reason = null;
};

Custom.vo.metrics.State.prototype = {
    constructor: Custom.vo.metrics.State
};

Hls = function() {
    "use strict";
    return {
        dependencies: {}
    };
}();

Hls.dependencies.HlsDemux = function() {
    "use strict";
    var pat = null, pmt = null, pidToTrackId = [], tracks = [], baseDts = -1, dtsOffset = -1, getTsPacket = function(data, pid, pusi) {
        var i = 0;
        while (i < data.length) {
            var tsPacket = new mpegts.ts.TsPacket();
            tsPacket.parse(data.subarray(i, i + mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE));
            if (tsPacket.getPid() === pid && (pusi === undefined || tsPacket.getPusi() === pusi)) {
                return tsPacket;
            }
            i += mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE;
        }
        return null;
    }, getPAT = function(data) {
        var tsPacket = getTsPacket.call(this, data, mpegts.ts.TsPacket.prototype.PAT_PID);
        if (tsPacket === null) {
            return null;
        }
        pat = new mpegts.si.PAT();
        pat.parse(tsPacket.getPayload());
        this.debug.log("[HlsDemux] PAT: PMT_PID=" + pat.getPmtPid());
        return pat;
    }, getPMT = function(data, pid) {
        var tsPacket = getTsPacket.call(this, data, pid);
        if (tsPacket === null) {
            return null;
        }
        pmt = new mpegts.si.PMT();
        pmt.parse(tsPacket.getPayload());
        this.debug.log("[HlsDemux] PMT");
        var trackIdCounter = 1;
        for (var i = 0; i < pmt.m_listOfComponents.length; i++) {
            var elementStream = pmt.m_listOfComponents[i];
            var track = new MediaPlayer.vo.Mp4Track();
            var streamTypeDesc = pmt.gStreamTypes[elementStream.m_stream_type];
            if (streamTypeDesc !== null) {
                track.streamType = streamTypeDesc.name;
                switch (streamTypeDesc.value) {
                  case 224:
                    track.type = "video";
                    break;

                  case 192:
                    track.type = "audio";
                    break;

                  case 252:
                    track.type = "data";
                    break;

                  default:
                    track.type = "und";
                }
            } else {
                this.debug.log("[HlsDemux] Stream Type " + elementStream.m_stream_type + " unknown!");
            }
            track.timescale = mpegts.Pts.prototype.SYSTEM_CLOCK_FREQUENCY;
            track.pid = elementStream.m_elementary_PID;
            track.trackId = trackIdCounter;
            pidToTrackId[elementStream.m_elementary_PID] = trackIdCounter;
            tracks.push(track);
            trackIdCounter++;
        }
        return pmt;
    }, demuxTsPacket = function(data) {
        var tsPacket, pid, trackId, track, sample = null, sampleData = null;
        tsPacket = new mpegts.ts.TsPacket();
        tsPacket.parse(data);
        if (tsPacket.hasAdaptationFieldOnly()) {
            return;
        }
        pid = tsPacket.getPid();
        trackId = pidToTrackId[pid];
        if (trackId === undefined) {
            return;
        }
        track = tracks[trackId - 1];
        if (tsPacket.getPusi()) {
            var pesPacket = new mpegts.pes.PesPacket();
            pesPacket.parse(tsPacket.getPayload());
            sample = new MediaPlayer.vo.Mp4Track.Sample();
            sample.cts = pesPacket.getPts().getValue();
            sample.dts = pesPacket.getDts() !== null ? pesPacket.getDts().getValue() : sample.cts;
            sample.size = 0;
            sample.duration = 0;
            sample.subSamples = [];
            if (baseDts === -1) {
                baseDts = sample.dts;
            }
            sample.dts -= baseDts;
            sample.cts -= baseDts;
            sample.dts += dtsOffset;
            sample.cts += dtsOffset;
            sampleData = pesPacket.getPayload();
            sample.subSamples.push(sampleData);
            track.samples.push(sample);
        } else {
            if (track.samples.length > 0) {
                sample = track.samples[track.samples.length - 1];
            }
            sample.subSamples.push(tsPacket.getPayload());
        }
    }, postProcess = function(track) {
        var sample, length = 0, offset = 0, subSamplesLength, i, s;
        for (i = 0; i < track.samples.length; i++) {
            subSamplesLength = 0;
            sample = track.samples[i];
            for (s = 0; s < sample.subSamples.length; s++) {
                subSamplesLength += sample.subSamples[s].length;
            }
            if (i > 0) {
                track.samples[i - 1].duration = track.samples[i].dts - track.samples[i - 1].dts;
            }
            sample.size = subSamplesLength;
            length += subSamplesLength;
        }
        track.samples[track.samples.length - 1].duration = track.samples[track.samples.length - 2].duration;
        track.data = new Uint8Array(length);
        for (i = 0; i < track.samples.length; i++) {
            sample = track.samples[i];
            for (s = 0; s < sample.subSamples.length; s++) {
                track.data.set(sample.subSamples[s], offset);
                offset += sample.subSamples[s].length;
            }
        }
        if (track.streamType.search("H.264") !== -1) {
            mpegts.h264.bytestreamToMp4(track.data);
        }
        if (track.streamType.search("ADTS") !== -1) {
            demuxADTS(track);
        }
    }, demuxADTS = function(track) {
        var aacFrames, aacSamples = [], length, offset, data, sample, cts, duration, i;
        aacFrames = mpegts.aac.parseADTS(track.data);
        length = 0;
        for (i = 0; i < aacFrames.length; i++) {
            length += aacFrames[i].length;
        }
        data = new Uint8Array(length);
        cts = track.samples[0].cts;
        duration = track.timescale * 1024 / track.samplingRate;
        offset = 0;
        for (i = 0; i < aacFrames.length; i++) {
            sample = new MediaPlayer.vo.Mp4Track.Sample();
            sample.cts = sample.dts = cts;
            sample.size = aacFrames[i].length;
            sample.duration = duration;
            aacSamples.push(sample);
            data.set(track.data.subarray(aacFrames[i].offset, aacFrames[i].offset + aacFrames[i].length), offset);
            offset += aacFrames[i].length;
        }
        track.data = data;
        track.samples = aacSamples;
    }, arrayToHexString = function(array) {
        var str = "";
        for (var i = 0; i < array.length; i++) {
            var h = array[i].toString(16);
            if (h.length < 2) {
                h = "0" + h;
            }
            str += h;
        }
        return str;
    }, doInit = function(startTime) {
        pat = null;
        pmt = null;
        tracks = [];
        if (dtsOffset === -1) {
            dtsOffset = startTime;
        }
    }, getTrackCodecInfo = function(data, track) {
        var tsPacket;
        if (track.codecs !== "") {
            return track;
        }
        tsPacket = getTsPacket.call(this, data, track.pid, true);
        if (tsPacket === null) {
            return null;
        }
        var pesPacket = new mpegts.pes.PesPacket();
        pesPacket.parse(tsPacket.getPayload());
        if (track.streamType.search("H.264") !== -1) {
            var sequenceHeader = mpegts.h264.getSequenceHeader(pesPacket.getPayload());
            track.codecPrivateData = arrayToHexString(sequenceHeader.bytes);
            track.codecs = "avc1.";
            var nalHeader = /00000001[0-9]7/.exec(track.codecPrivateData);
            if (nalHeader && nalHeader[0]) {
                track.codecs += track.codecPrivateData.substr(track.codecPrivateData.indexOf(nalHeader[0]) + 10, 6);
            }
            track.width = sequenceHeader.width;
            track.height = sequenceHeader.height;
        }
        if (track.streamType.search("AAC") !== -1) {
            var codecPrivateData = mpegts.aac.getAudioSpecificConfig(pesPacket.getPayload());
            var objectType = (codecPrivateData[0] & 248) >> 3;
            track.codecPrivateData = arrayToHexString(codecPrivateData);
            track.codecs = "mp4a.40." + objectType;
            var samplingFrequencyIndex = (codecPrivateData[0] & 7) << 1 | (codecPrivateData[1] & 128) >> 7;
            track.samplingRate = mpegts.aac.SAMPLING_FREQUENCY[samplingFrequencyIndex];
            track.channels = (codecPrivateData[1] & 120) >> 3;
            track.bandwidth = 0;
        }
        this.debug.log("[HlsDemux][" + track.trackId + "] track codecPrivateData = " + track.codecPrivateData);
        this.debug.log("[HlsDemux][" + track.trackId + "] track codecs = " + track.codecs);
        return track;
    }, doGetTracks = function(data) {
        if (pat === null) {
            pat = getPAT.call(this, data);
            if (pat === null) {
                return;
            }
        }
        if (pmt === null) {
            pmt = getPMT.call(this, data, pat.getPmtPid());
            if (pmt === null) {
                return;
            }
        }
        for (var i = tracks.length - 1; i >= 0; i--) {
            getTrackCodecInfo.call(this, data, tracks[i]);
            if (tracks[i].codecs === "") {
                tracks.splice(i, 1);
            }
        }
        return tracks;
    }, doDemux = function(data) {
        var nbPackets = data.length / mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE, i = 0;
        this.debug.log("[HlsDemux] Demux chunk, size = " + data.length + ", nb packets = " + nbPackets);
        if (doGetTracks.call(this, data) === null) {
            return null;
        }
        if (pmt === null) {
            return tracks;
        }
        for (i = 0; i < tracks.length; i++) {
            tracks[i].samples = [];
            tracks[i].data = null;
        }
        i = 0;
        while (i < data.length) {
            demuxTsPacket.call(this, data.subarray(i, i + mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE));
            i += mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE;
        }
        this.debug.log("[HlsDemux] Demux: baseDts = " + baseDts + ", dtsOffset = " + dtsOffset);
        for (i = 0; i < tracks.length; i++) {
            postProcess.call(this, tracks[i]);
            this.debug.log("[HlsDemux][" + tracks[i].trackId + "] Demux: 1st PTS = " + tracks[i].samples[0].dts + " (" + tracks[i].samples[0].dts / 9e4 + ")");
        }
        return tracks;
    };
    return {
        debug: undefined,
        reset: doInit,
        getTracks: doGetTracks,
        demux: doDemux
    };
};

Hls.dependencies.HlsDemux.prototype = {
    constructor: Hls.dependencies.HlsDemux
};

Hls.dependencies.HlsFragmentController = function() {
    "use strict";
    var lastRequestQuality = null;
    var generateInitSegment = function(data) {
        var manifest = rslt.manifestModel.getValue();
        var tracks = rslt.hlsDemux.getTracks(new Uint8Array(data));
        for (var i = 0; i < tracks.length; i++) {
            tracks[i].duration = manifest.mediaPresentationDuration;
        }
        return rslt.mp4Processor.generateInitSegment(tracks);
    }, generateMediaSegment = function(data) {
        var tracks = rslt.hlsDemux.demux(new Uint8Array(data));
        return rslt.mp4Processor.generateMediaSegment(tracks, rslt.sequenceNumber);
    };
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.FragmentController);
    rslt.manifestModel = undefined;
    rslt.hlsDemux = undefined;
    rslt.mp4Processor = undefined;
    rslt.sequenceNumber = 1;
    rslt.process = function(bytes, request, representations) {
        var result = null, InitSegmentData = null;
        if (bytes === null || bytes === undefined || bytes.byteLength === 0) {
            return Q.when(bytes);
        }
        if (request && request.type === "Media Segment" && representations && representations.length > 0) {
            if (lastRequestQuality === null || lastRequestQuality !== request.quality) {
                rslt.hlsDemux.reset(request.startTime * 9e4);
                InitSegmentData = generateInitSegment(bytes);
                request.index = undefined;
                lastRequestQuality = request.quality;
            }
            result = generateMediaSegment(bytes);
            if (InitSegmentData !== null) {
                var catArray = new Uint8Array(InitSegmentData.length + result.length);
                catArray.set(InitSegmentData, 0);
                catArray.set(result, InitSegmentData.length);
                result = catArray;
            }
            rslt.sequenceNumber++;
        }
        return Q.when(result);
    };
    return rslt;
};

Hls.dependencies.HlsFragmentController.prototype = {
    constructor: Hls.dependencies.HlsFragmentController
};

Hls.dependencies.HlsHandler = function() {
    var getInit = function(representation) {
        var period = null;
        var self = this;
        var presentationStartTime = null;
        var deferred = Q.defer();
        period = representation.adaptation.period;
        presentationStartTime = period.start;
        var manifest = rslt.manifestModel.getValue();
        var isDynamic = rslt.manifestExt.getIsDynamic(manifest);
        var request = new MediaPlayer.vo.SegmentRequest();
        request.streamType = rslt.getType();
        request.type = "Initialization Segment";
        request.url = null;
        request.data = 1;
        request.range = representation.range;
        request.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        request.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);
        request.quality = representation.index;
        deferred.resolve(request);
        return deferred.promise;
    };
    var rslt = Custom.utils.copyMethods(Dash.dependencies.DashHandler);
    rslt.getInitRequest = getInit;
    return rslt;
};

Hls.dependencies.HlsHandler.prototype = {
    constructor: Hls.dependencies.HlsHandler
};

Hls.dependencies.HlsParser = function() {
    var TAG_EXTM3U = "#EXTM3U", TAG_EXTINF = "#EXTINF", TAG_EXTXVERSION = "#EXT-X-VERSION", TAG_EXTXTARGETDURATION = "#EXT-X-TARGETDURATION", TAG_EXTXMEDIASEQUENCE = "#EXT-X-MEDIA-SEQUENCE", TAG_EXTXSTREAMINF = "#EXT-X-STREAM-INF", TAG_EXTXENDLIST = "#EXT-X-ENDLIST", ATTR_BANDWIDTH = "BANDWIDTH", ATTR_PROGRAMID = "PROGRAM-ID", ATTR_AUDIO = "AUDIO", ATTR_SUBTITLES = "SUBTITLES", ATTR_RESOLUTION = "RESOLUTION", ATTR_CODECS = "CODECS";
    var _splitLines = function(oData) {
        oData = oData.split("\n");
        for (var i = 0; i < oData.length; i++) {
            if (oData[i] === "" || oData[i] === " ") {
                oData.splice(i, 1);
                i--;
            }
        }
        return oData;
    };
    var _containsTag = function(data, tag) {
        return data.indexOf(tag) > -1;
    };
    var _getTagValue = function(data, tag) {
        return data.substring(tag.length + 1, data.length);
    };
    var _getTagParams = function(data) {
        return data.substring(data.indexOf(":") + 1).split(",");
    };
    var _parseStreamInf = function(streamInfArray) {
        var stream = {
            programId: "",
            bandwidth: 0,
            resolution: "0x0",
            codecs: ""
        }, name = "", value = "", i, streamParams = _getTagParams(streamInfArray[0]);
        for (i = streamParams.length - 1; i >= 0; i--) {
            if (streamParams[i].indexOf("=") === -1 && i > 0) {
                streamParams[i - 1] += "," + streamParams[i];
            } else {
                name = streamParams[i].trim().split("=")[0];
                value = streamParams[i].trim().split("=")[1];
                switch (name) {
                  case ATTR_PROGRAMID:
                    stream.programId = value;
                    break;

                  case ATTR_BANDWIDTH:
                    stream.bandwidth = parseInt(value, 10);
                    break;

                  case ATTR_RESOLUTION:
                    stream.resolution = value;
                    break;

                  case ATTR_CODECS:
                    stream.codecs = value.replace(/"/g, "");
                    break;

                  case ATTR_AUDIO:
                    stream.audioId = value;
                    break;

                  case ATTR_SUBTITLES:
                    stream.subtitlesId = value;
                    break;

                  default:
                    break;
                }
            }
        }
        stream.uri = streamInfArray[1];
        return stream;
    };
    var _parseExtInf = function(extInf) {
        var media = {}, mediaParams = _getTagParams(extInf[0]);
        media.duration = parseInt(mediaParams[0], 10);
        media.title = mediaParams[1];
        media.uri = extInf[1];
        return media;
    };
    var _getVariantStreams = function(data) {
        var streamsArray = [];
        for (var i = 0; i < data.length; i++) {
            if (_containsTag(data[i], TAG_EXTXSTREAMINF)) {
                streamsArray.push(_parseStreamInf([ data[i], data[i + 1] ]));
            }
        }
        return streamsArray;
    };
    var _parsePlaylist = function(deferred, data, representation) {
        var segmentList, segments, segment, initialization, version, duration = 0, index = 0, media, i, self = this;
        self.debug.log(data);
        data = _splitLines(data);
        if (data && data.length && data[0].trim() !== TAG_EXTM3U) {
            deferred.resolve();
            return;
        }
        segmentList = {
            name: "SegmentList",
            isRoot: false,
            isArray: false,
            duration: 0,
            startNumber: 0,
            timescale: 1,
            BaseURL: representation.BaseURL,
            SegmentURL_asArray: []
        };
        representation[segmentList.name] = segmentList;
        segments = segmentList.SegmentURL_asArray;
        representation.duration = Infinity;
        for (i = 1; i < data.length; i++) {
            if (_containsTag(data[i], TAG_EXTXVERSION)) {
                version = _getTagValue(data[i], TAG_EXTXVERSION);
            } else if (_containsTag(data[i], TAG_EXTXTARGETDURATION)) {
                segmentList.duration = parseInt(_getTagValue(data[i], TAG_EXTXTARGETDURATION), 10);
            } else if (_containsTag(data[i], TAG_EXTXMEDIASEQUENCE)) {
                segmentList.startNumber = parseInt(_getTagValue(data[i], TAG_EXTXMEDIASEQUENCE), 10);
            } else if (_containsTag(data[i], TAG_EXTINF)) {
                media = _parseExtInf([ data[i], data[i + 1] ]);
                segment = {
                    name: "SegmentURL",
                    isRoot: false,
                    isArray: true,
                    media: media.uri.indexOf("http://") !== -1 ? media.uri : segmentList.BaseURL + media.uri,
                    sequenceNumber: segmentList.startNumber + index,
                    time: segments.length === 0 ? 0 : segments[segments.length - 1].time + segments[segments.length - 1].duration,
                    duration: media.duration
                };
                segments.push(segment);
                duration += media.duration;
                index++;
            } else if (_containsTag(data[i], TAG_EXTXENDLIST)) {
                representation.duration = duration;
            }
        }
        initialization = {
            name: "Initialization",
            sourceURL: representation.SegmentList.SegmentURL_asArray[0].media
        };
        representation.SegmentList.Initialization = initialization;
        deferred.resolve();
    };
    var postProcess = function(manifest, quality) {
        var deferred = Q.defer(), period = manifest.Period_asArray[0], adaptationSet = period.AdaptationSet_asArray[0], representation = adaptationSet.Representation_asArray[quality], request = new MediaPlayer.vo.SegmentRequest(), self = this;
        period.start = 0;
        adaptationSet.duration = representation.duration;
        period.duration = representation.duration;
        if (representation.duration !== Infinity) {
            manifest.mediaPresentationDuration = representation.duration;
        }
        manifest.type = representation.duration === Infinity ? "dynamic" : "static";
        var manifestDuration = representation.SegmentList.duration * representation.SegmentList.SegmentURL_asArray.length;
        if (manifest.type === "dynamic") {
            var mpdLoadedTime = new Date();
            manifest.availabilityStartTime = new Date(mpdLoadedTime.getTime() - manifestDuration * 1e3);
            manifest.timeShiftBufferDepth = manifestDuration - representation.SegmentList.duration;
        }
        manifest.minBufferTime = representation.SegmentList.duration * 2;
        representation = adaptationSet.Representation_asArray[quality];
        request.type = "Initialization Segment";
        request.url = representation.SegmentList.Initialization.sourceURL;
        var onLoaded = function(representation, response) {
            var tracks = this.hlsDemux.getTracks(new Uint8Array(response.data));
            representation.codecs = "";
            for (var i = 0; i < tracks.length; i++) {
                representation.codecs += tracks[i].codecs;
                if (i < tracks.length - 1) {
                    representation.codecs += ",";
                }
            }
            deferred.resolve();
        };
        var onError = function() {
            deferred.resolve();
        };
        if (representation.codecs === "") {
            self.debug.log("[HlsParser]", "Load initialization segment: " + request.url);
            self.fragmentLoader.load(request).then(onLoaded.bind(self, representation), onError.bind(self));
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };
    var parseBaseUrl = function(url) {
        var base = null;
        if (url.indexOf("/") !== -1) {
            if (url.indexOf("?") !== -1) {
                url = url.substring(0, url.indexOf("?"));
            }
            base = url.substring(0, url.lastIndexOf("/") + 1);
        }
        return base;
    };
    var processManifest = function(data, baseUrl) {
        var deferred = Q.defer(), mpd, period, adaptationsSets = [], adaptationSet, representations = [], representation, representationId = 0, streams = [], stream, self = this;
        if (!data || data.length <= 0 || data[0].trim() !== TAG_EXTM3U) {
            deferred.reject(new Error("Can't parse manifest"));
            return deferred.promise;
        }
        mpd = {};
        mpd.name = "M3U";
        mpd.isRoot = true;
        mpd.isArray = true;
        mpd.parent = null;
        mpd.BaseURL = baseUrl;
        mpd.profiles = "urn:mpeg:dash:profile:isoff-live:2011";
        mpd.type = "static";
        period = {};
        period.name = "Period";
        period.isRoot = false;
        period.isArray = false;
        period.parent = mpd;
        period.duration = 0;
        period.BaseURL = mpd.BaseURL;
        mpd.Period = period;
        mpd.Period_asArray = [ period ];
        adaptationsSets = [];
        period.AdaptationSet = adaptationsSets;
        period.AdaptationSet_asArray = adaptationsSets;
        streams = _getVariantStreams(data.slice(1));
        streams.sort(function(a, b) {
            return a.bandwidth - b.bandwidth;
        });
        adaptationSet = {
            name: "AdaptationSet",
            isRoot: false,
            isArray: true,
            id: "video",
            lang: "",
            contentType: "video",
            mimeType: "video/mp4",
            maxWidth: 0,
            maxHeight: 0,
            BaseURL: period.BaseURL,
            Representation: representations,
            Representation_asArray: representations
        };
        for (var i = 0; i < streams.length; i++) {
            stream = streams[i];
            if (stream.bandwidth > 64e3) {
                representation = {
                    name: "Representation",
                    isRoot: false,
                    isArray: true,
                    id: representationId.toString(),
                    mimeType: "video/mp4",
                    codecs: stream.codecs,
                    bandwidth: stream.bandwidth,
                    width: parseInt(stream.resolution.split("x")[0], 10),
                    height: parseInt(stream.resolution.split("x")[1], 10),
                    url: stream.uri.indexOf("http://") > -1 ? stream.uri : adaptationSet.BaseURL + stream.uri
                };
                representation.BaseURL = parseBaseUrl(representation.url);
                representations.push(representation);
                representationId++;
            }
        }
        adaptationsSets.push(adaptationSet);
        self.abrController.getPlaybackQuality("video", adaptationSet).then(function(result) {
            representation = adaptationSet.Representation_asArray[result.quality];
            doUpdatePlaylist.call(self, representation).then(function() {
                postProcess.call(self, mpd, result.quality).then(function() {
                    deferred.resolve(mpd);
                });
            });
        });
        return deferred.promise;
    };
    var internalParse = function(data, baseUrl) {
        this.debug.log("[HlsParser]", "Doing parse.");
        this.debug.log("[HlsParser]", data);
        return processManifest.call(this, _splitLines(data), baseUrl);
    };
    var doUpdatePlaylist = function(representation) {
        return Custom.utils.doRequestWithPromise.call(this, representation.url, _parsePlaylist, representation);
    };
    return {
        debug: undefined,
        manifestModel: undefined,
        fragmentLoader: undefined,
        abrController: undefined,
        hlsDemux: undefined,
        parse: internalParse,
        updatePlaylist: doUpdatePlaylist
    };
};

Hls.dependencies.HlsParser.prototype = {
    constructor: Hls.dependencies.HlsParser
};

Mss = function() {
    "use strict";
    return {
        dependencies: {}
    };
}();

Mss.dependencies.MssFragmentController = function() {
    "use strict";
    var getIndex = function(adaptation, manifest) {
        var periods = manifest.Period_asArray, i, j;
        for (i = 0; i < periods.length; i += 1) {
            var adaptations = periods[i].AdaptationSet_asArray;
            for (j = 0; j < adaptations.length; j += 1) {
                if (adaptations[j] === adaptation) {
                    return j;
                }
            }
        }
        return -1;
    }, processTfrf = function(tfrf, adaptation) {
        var manifest = rslt.manifestModel.getValue(), segmentsUpdated = false, segments = adaptation.SegmentTemplate.SegmentTimeline.S, entries = tfrf.entry, fragment_absolute_time = 0, fragment_duration = 0, segment = null, r = 0, t = 0, i = 0, availabilityStartTime = null;
        while (i < entries.length) {
            fragment_absolute_time = entries[i].fragment_absolute_time;
            fragment_duration = entries[i].fragment_duration;
            segment = segments[segments.length - 1];
            r = segment.r === undefined ? 0 : segment.r;
            t = segment.t + segment.d * r;
            if (fragment_absolute_time > t) {
                rslt.debug.log("[MssFragmentController] Add new segment - t = " + fragment_absolute_time / 1e7);
                if (fragment_duration === segment.d) {
                    segment.r = r + 1;
                } else {
                    segments.push({
                        t: fragment_absolute_time,
                        d: fragment_duration
                    });
                }
                segmentsUpdated = true;
            }
            i += 1;
        }
        if (segmentsUpdated) {
            segment = segments[segments.length - 1];
            r = segment.r === undefined ? 0 : segment.r;
            t = segment.t + segment.d * r;
            availabilityStartTime = t - manifest.timeShiftBufferDepth * 1e7;
            segment = segments[0];
            while (segment.t < availabilityStartTime) {
                rslt.debug.log("[MssFragmentController] Remove segment  - t = " + segment.t / 1e7);
                if (segment.r !== undefined && segment.r > 0) {
                    segment.t += segment.d;
                    segment.r -= 1;
                } else {
                    segments.splice(0, 1);
                }
                segment = segments[0];
            }
        }
    }, convertFragment = function(data, request, adaptation) {
        var i = 0;
        var manifest = rslt.manifestModel.getValue();
        var trackId = getIndex(adaptation, manifest) + 1;
        var fragment = mp4lib.deserialize(data);
        if (!fragment) {
            return null;
        }
        var moof = fragment.getBoxByType("moof");
        var mdat = fragment.getBoxByType("mdat");
        var traf = moof.getBoxByType("traf");
        var trun = traf.getBoxByType("trun");
        var tfhd = traf.getBoxByType("tfhd");
        var saio = null;
        var sepiff = traf.getBoxByType("sepiff");
        if (sepiff !== null) {
            sepiff.boxtype = "senc";
            sepiff.extended_type = undefined;
            saio = new mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox();
            saio.version = 0;
            saio.flags = 0;
            saio.entry_count = 1;
            saio.offset = [];
            var saiz = new mp4lib.boxes.SampleAuxiliaryInformationSizesBox();
            saiz.version = 0;
            saiz.flags = 0;
            saiz.sample_count = sepiff.sample_count;
            saiz.default_sample_info_size = 0;
            saiz.sample_info_size = [];
            var sizedifferent = false;
            if (sepiff.flags & 2) {
                for (i = 0; i < sepiff.sample_count; i++) {
                    saiz.sample_info_size[i] = 8 + sepiff.entry[i].NumberOfEntries * 6 + 2;
                    if (i > 0) {
                        if (saiz.sample_info_size[i] != saiz.sample_info_size[i - 1]) {
                            sizedifferent = true;
                        }
                    }
                }
                if (sizedifferent === false) {
                    saiz.default_sample_info_size = saiz.sample_info_size[0];
                    saiz.sample_info_size = [];
                }
            } else {
                saiz.default_sample_info_size = 8;
            }
            traf.boxes.push(saiz);
            traf.boxes.push(saio);
        }
        tfhd.track_ID = trackId;
        traf.removeBoxByType("tfxd");
        var tfdt = traf.getBoxByType("tfdt");
        if (tfdt === null) {
            tfdt = new mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox();
            tfdt.version = 1;
            tfdt.flags = 0;
            tfdt.baseMediaDecodeTime = Math.floor(request.startTime * request.timescale);
            var pos = traf.getBoxPositionByType("tfhd");
            traf.boxes.splice(pos + 1, 0, tfdt);
        }
        var tfrf = traf.getBoxesByType("tfrf");
        if (tfrf.length !== 0) {
            for (i = 0; i < tfrf.length; i++) {
                processTfrf(tfrf[i], adaptation);
                traf.removeBoxByType("tfrf");
            }
        }
        tfhd.flags &= 16777214;
        tfhd.flags |= 131072;
        trun.flags |= 1;
        trun.data_offset = 0;
        if (sepiff !== null) {
            var moofpositionInFragment = fragment.getBoxPositionByType("moof") + 8;
            var trafpositionInMoof = moof.getBoxPositionByType("traf") + 8;
            var sencpositionInTraf = traf.getBoxPositionByType("senc") + 8;
            saio.offset[0] = moofpositionInFragment + trafpositionInMoof + sencpositionInTraf + 8;
        }
        var fragment_size = fragment.getLength();
        trun.data_offset = fragment_size - mdat.size + 8;
        if (navigator.userAgent.indexOf("Chrome") >= 0 && manifest.type === "dynamic") {
            tfdt.baseMediaDecodeTime /= 1e3;
            for (i = 0; i < trun.samples_table.length; i++) {
                if (trun.samples_table[i].sample_composition_time_offset > 0) {
                    trun.samples_table[i].sample_composition_time_offset /= 1e3;
                }
                if (trun.samples_table[i].sample_duration > 0) {
                    trun.samples_table[i].sample_duration /= 1e3;
                }
            }
        }
        var new_data = mp4lib.serialize(fragment);
        return new_data;
    };
    var rslt = Custom.utils.copyMethods(MediaPlayer.dependencies.FragmentController);
    rslt.manifestModel = undefined;
    rslt.mp4Processor = undefined;
    rslt.process = function(bytes, request, representations) {
        var result = null, manifest = this.manifestModel.getValue();
        if (bytes !== null && bytes !== undefined && bytes.byteLength > 0) {
            result = new Uint8Array(bytes);
        } else {
            return Q.when(null);
        }
        if (request && request.type === "Media Segment" && representations && representations.length > 0) {
            var adaptation = manifest.Period_asArray[representations[0].adaptation.period.index].AdaptationSet_asArray[representations[0].adaptation.index];
            result = convertFragment(result, request, adaptation);
            if (!result) {
                return Q.when(null);
            }
        }
        if (request === undefined && navigator.userAgent.indexOf("Chrome") >= 0 && manifest.type === "dynamic") {
            var init_segment = mp4lib.deserialize(result);
            var moov = init_segment.getBoxByType("moov");
            var mvhd = moov.getBoxByType("mvhd");
            var trak = moov.getBoxByType("trak");
            var mdia = trak.getBoxByType("mdia");
            var mdhd = mdia.getBoxByType("mdhd");
            mvhd.timescale /= 1e3;
            mdhd.timescale /= 1e3;
            result = mp4lib.serialize(init_segment);
        }
        return Q.when(result);
    };
    return rslt;
};

Mss.dependencies.MssFragmentController.prototype = {
    constructor: Mss.dependencies.MssFragmentController
};

Mss.dependencies.MssHandler = function() {
    var isDynamic = false, getAudioChannels = function(adaptation, representation) {
        var channels = 1;
        if (adaptation.audioChannels) {
            channels = adaptation.audioChannels;
        } else if (representation.audioChannels) {
            channels = representation.audioChannels;
        }
        return channels;
    }, getAudioSamplingRate = function(adaptation, representation) {
        var samplingRate = 1;
        if (adaptation.audioSamplingRate) {
            samplingRate = adaptation.audioSamplingRate;
        } else {
            samplingRate = representation.audioSamplingRate;
        }
        return samplingRate;
    }, getInitData = function(representation) {
        if (representation) {
            if (!representation.initData) {
                var manifest = rslt.manifestModel.getValue();
                var adaptation = representation.adaptation;
                var realAdaptation = manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index];
                var realRepresentation = realAdaptation.Representation_asArray[representation.index];
                var track = new MediaPlayer.vo.Mp4Track();
                track.type = rslt.getType() || "und";
                track.trackId = adaptation.index + 1;
                track.timescale = representation.timescale;
                track.duration = representation.adaptation.period.duration;
                track.codecs = realRepresentation.codecs;
                track.codecPrivateData = realRepresentation.codecPrivateData;
                track.bandwidth = realRepresentation.bandwidth;
                if (realAdaptation.ContentProtection !== undefined) {
                    track.contentProtection = realAdaptation.ContentProtection;
                }
                track.width = realRepresentation.width || realAdaptation.maxWidth;
                track.height = realRepresentation.height || realAdaptation.maxHeight;
                track.language = realAdaptation.lang ? realAdaptation.lang : "und";
                track.channels = getAudioChannels(realAdaptation, realRepresentation);
                track.samplingRate = getAudioSamplingRate(realAdaptation, realRepresentation);
                representation.initData = rslt.mp4Processor.generateInitSegment([ track ]);
            }
            return representation.initData;
        } else {
            return null;
        }
    };
    var rslt = Custom.utils.copyMethods(Dash.dependencies.DashHandler);
    rslt.mp4Processor = undefined;
    rslt.getInitRequest = function(representation) {
        var period = null;
        var self = this;
        var presentationStartTime = null;
        var deferred = Q.defer();
        period = representation.adaptation.period;
        presentationStartTime = period.start;
        var manifest = rslt.manifestModel.getValue();
        isDynamic = rslt.manifestExt.getIsDynamic(manifest);
        var request = new MediaPlayer.vo.SegmentRequest();
        request.streamType = rslt.getType();
        request.type = "Initialization Segment";
        request.url = null;
        request.data = getInitData(representation);
        request.range = representation.range;
        request.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        request.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);
        request.quality = representation.index;
        deferred.resolve(request);
        return deferred.promise;
    };
    return rslt;
};

Mss.dependencies.MssHandler.prototype = {
    constructor: Mss.dependencies.MssHandler
};

Mss.dependencies.MssParser = function() {
    "use strict";
    var TIME_SCALE_100_NANOSECOND_UNIT = 1e7;
    var numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/;
    var hexadecimalRegex = /^0[xX][A-Fa-f0-9]+$/;
    var samplingFrequencyIndex = {
        96e3: 0,
        88200: 1,
        64e3: 2,
        48e3: 3,
        44100: 4,
        32e3: 5,
        24e3: 6,
        22050: 7,
        16e3: 8,
        12e3: 9,
        11025: 10,
        8e3: 11,
        7350: 12
    };
    var matchers = [ {
        type: "numeric",
        test: function(str) {
            return numericRegex.test(str);
        },
        converter: function(str) {
            return parseFloat(str);
        }
    }, {
        type: "hexadecimal",
        test: function(str) {
            return hexadecimalRegex.test(str);
        },
        converter: function(str) {
            return str.substr(2);
        }
    } ];
    var mimeTypeMap = {
        video: "video/mp4",
        audio: "audio/mp4",
        text: "application/ttml+xml+mp4"
    };
    var mapPeriod = function(manifest) {
        var period = {}, adaptations = [], i;
        period.duration = manifest.Duration === 0 ? Infinity : parseFloat(manifest.Duration) / TIME_SCALE_100_NANOSECOND_UNIT;
        period.BaseURL = manifest.BaseURL;
        for (i = 0; i < manifest.StreamIndex_asArray.length; i++) {
            manifest.StreamIndex_asArray[i].BaseURL = period.BaseURL;
            adaptations.push(mapAdaptationSet(manifest.StreamIndex_asArray[i]));
        }
        period.AdaptationSet = adaptations.length > 1 ? adaptations : adaptations[0];
        period.AdaptationSet_asArray = adaptations;
        return period;
    };
    var mapAdaptationSet = function(streamIndex) {
        var adaptationSet = {}, representations = [], representation, segmentTemplate = {}, i;
        adaptationSet.id = streamIndex.Name;
        adaptationSet.lang = streamIndex.Language;
        adaptationSet.contentType = streamIndex.Type;
        adaptationSet.mimeType = mimeTypeMap[streamIndex.Type];
        adaptationSet.maxWidth = streamIndex.MaxWidth;
        adaptationSet.maxHeight = streamIndex.MaxHeight;
        adaptationSet.BaseURL = streamIndex.BaseURL;
        segmentTemplate = mapSegmentTemplate(streamIndex);
        for (i = 0; i < streamIndex.QualityLevel_asArray.length; i++) {
            streamIndex.QualityLevel_asArray[i].BaseURL = adaptationSet.BaseURL;
            streamIndex.QualityLevel_asArray[i].mimeType = adaptationSet.mimeType;
            streamIndex.QualityLevel_asArray[i].Id = adaptationSet.id + "_" + streamIndex.QualityLevel_asArray[i].Index;
            representation = mapRepresentation(streamIndex.QualityLevel_asArray[i]);
            representation.SegmentTemplate = segmentTemplate;
            representations.push(representation);
        }
        adaptationSet.Representation = representations.length > 1 ? representations : representations[0];
        adaptationSet.Representation_asArray = representations;
        adaptationSet.SegmentTemplate = segmentTemplate;
        return adaptationSet;
    };
    var mapRepresentation = function(qualityLevel) {
        var representation = {};
        representation.id = qualityLevel.Id;
        representation.bandwidth = qualityLevel.Bitrate;
        representation.mimeType = qualityLevel.mimeType;
        representation.width = qualityLevel.MaxWidth;
        representation.height = qualityLevel.MaxHeight;
        if (qualityLevel.FourCC === "H264" || qualityLevel.FourCC === "AVC1") {
            representation.codecs = getH264Codec(qualityLevel);
        } else if (qualityLevel.FourCC.indexOf("AAC") >= 0) {
            representation.codecs = getAACCodec(qualityLevel);
        }
        representation.audioSamplingRate = qualityLevel.SamplingRate;
        representation.audioChannels = qualityLevel.Channels;
        representation.codecPrivateData = "" + qualityLevel.CodecPrivateData;
        representation.BaseURL = qualityLevel.BaseURL;
        return representation;
    };
    var getH264Codec = function(qualityLevel) {
        var codecPrivateData = qualityLevel.CodecPrivateData.toString(), nalHeader, avcoti;
        nalHeader = /00000001[0-9]7/.exec(codecPrivateData);
        avcoti = nalHeader && nalHeader[0] ? codecPrivateData.substr(codecPrivateData.indexOf(nalHeader[0]) + 10, 6) : undefined;
        return "avc1." + avcoti;
    };
    var getAACCodec = function(qualityLevel) {
        var objectType = 0, codecPrivateData = qualityLevel.CodecPrivateData.toString(), codecPrivateDataHex, arr16;
        if (qualityLevel.FourCC === "AACH") {
            objectType = 5;
        }
        if (codecPrivateData === undefined || codecPrivateData === "") {
            objectType = 2;
            var indexFreq = samplingFrequencyIndex[qualityLevel.SamplingRate];
            if (qualityLevel.FourCC === "AACH") {
                objectType = 5;
                codecPrivateData = new Uint8Array(4);
                var extensionSamplingFrequencyIndex = samplingFrequencyIndex[qualityLevel.SamplingRate * 2];
                codecPrivateData[0] = objectType << 3 | indexFreq >> 1;
                codecPrivateData[1] = indexFreq << 7 | qualityLevel.Channels << 3 | extensionSamplingFrequencyIndex >> 1;
                codecPrivateData[2] = extensionSamplingFrequencyIndex << 7 | 2 << 2;
                codecPrivateData[3] = 0;
                arr16 = new Uint16Array(2);
                arr16[0] = (codecPrivateData[0] << 8) + codecPrivateData[1];
                arr16[1] = (codecPrivateData[2] << 8) + codecPrivateData[3];
                codecPrivateDataHex = arr16[0].toString(16);
                codecPrivateDataHex = arr16[0].toString(16) + arr16[1].toString(16);
            } else {
                codecPrivateData = new Uint8Array(2);
                codecPrivateData[0] = objectType << 3 | indexFreq >> 1;
                codecPrivateData[1] = indexFreq << 7 | qualityLevel.Channels << 3;
                arr16 = new Uint16Array(1);
                arr16[0] = (codecPrivateData[0] << 8) + codecPrivateData[1];
                codecPrivateDataHex = arr16[0].toString(16);
            }
            codecPrivateData = "" + codecPrivateDataHex;
            codecPrivateData = codecPrivateData.toUpperCase();
            qualityLevel.CodecPrivateData = codecPrivateData;
        } else if (objectType === 0) objectType = (parseInt(codecPrivateData.substr(0, 2), 16) & 248) >> 3;
        return "mp4a.40." + objectType;
    };
    var mapSegmentTemplate = function(streamIndex) {
        var segmentTemplate = {}, mediaUrl;
        mediaUrl = streamIndex.Url.replace("{bitrate}", "$Bandwidth$");
        mediaUrl = mediaUrl.replace("{start time}", "$Time$");
        segmentTemplate.media = mediaUrl;
        segmentTemplate.timescale = TIME_SCALE_100_NANOSECOND_UNIT;
        segmentTemplate.SegmentTimeline = mapSegmentTimeline(streamIndex);
        return segmentTemplate;
    };
    var mapSegmentTimeline = function(streamIndex) {
        var segmentTimeline = {}, chunks = streamIndex.c_asArray, segments = [], i = 0;
        if (chunks.length > 1) {
            chunks[0].t = chunks[0].t || 0;
            for (i = 1; i < chunks.length; i++) {
                chunks[i - 1].d = chunks[i - 1].d || chunks[i].t - chunks[i - 1].t;
                chunks[i].t = chunks[i].t || chunks[i - 1].t + chunks[i - 1].d;
            }
            segments.push({
                d: chunks[0].d,
                r: 0,
                t: chunks[0].t
            });
            for (i = 1; i < chunks.length; i++) {
                if (chunks[i].d === chunks[i - 1].d) {
                    ++segments[segments.length - 1].r;
                } else {
                    segments.push({
                        d: chunks[i].d,
                        r: 0,
                        t: chunks[i].t
                    });
                }
            }
        }
        segmentTimeline.S = segments;
        segmentTimeline.S_asArray = segments;
        return segmentTimeline;
    };
    var mapContentProtection = function(protectionHeader) {
        var contentProtection = {}, pro, systemID = protectionHeader.SystemID;
        pro = {
            __text: protectionHeader.__text,
            __prefix: "mspr"
        };
        if (systemID[0] === "{") {
            systemID = systemID.substring(1, systemID.length - 1);
        }
        contentProtection.schemeIdUri = "urn:uuid:" + systemID;
        contentProtection.value = 2;
        contentProtection.pro = pro;
        contentProtection.pro_asArray = pro;
        return contentProtection;
    };
    var processManifest = function(manifest, manifestLoadedTime) {
        var mpd = {}, period, adaptations, i;
        mpd.profiles = "urn:mpeg:dash:profile:isoff-live:2011";
        mpd.type = manifest.IsLive ? "dynamic" : "static";
        mpd.timeShiftBufferDepth = parseFloat(manifest.DVRWindowLength) / TIME_SCALE_100_NANOSECOND_UNIT;
        mpd.mediaPresentationDuration = manifest.Duration === 0 ? Infinity : parseFloat(manifest.Duration) / TIME_SCALE_100_NANOSECOND_UNIT;
        mpd.BaseURL = manifest.BaseURL;
        mpd.minBufferTime = MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME;
        if (mpd.type === "dynamic") {
            mpd.availabilityStartTime = new Date(manifestLoadedTime.getTime() - mpd.timeShiftBufferDepth * 1e3);
        }
        mpd.Period = mapPeriod(manifest);
        mpd.Period_asArray = [ mpd.Period ];
        period = mpd.Period;
        period.start = 0;
        if (manifest.Protection !== undefined) {
            mpd.ContentProtection = mapContentProtection(manifest.Protection.ProtectionHeader);
            mpd.ContentProtection_asArray = [ mpd.ContentProtection ];
        }
        adaptations = period.AdaptationSet_asArray;
        for (i = 0; i < adaptations.length; i += 1) {
            if (mpd.type === "static") {
                var fistSegment = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray[0];
                var adaptationTimeOffset = parseFloat(fistSegment.t) / TIME_SCALE_100_NANOSECOND_UNIT;
                period.start = period.start === 0 ? adaptationTimeOffset : Math.max(period.start, adaptationTimeOffset);
            }
            if (mpd.ContentProtection !== undefined) {
                adaptations[i].ContentProtection = mpd.ContentProtection;
                adaptations[i].ContentProtection_asArray = mpd.ContentProtection_asArray;
            }
        }
        delete mpd.ContentProtection;
        delete mpd.ContentProtection_asArray;
        return mpd;
    };
    var internalParse = function(data, baseUrl) {
        this.debug.info("[MssParser]", "Doing parse.");
        var manifest = null, converter = new X2JS(matchers, "", true), start = new Date(), json = null, mss2dash = null;
        manifest = converter.xml_str2json(data);
        json = new Date();
        if (manifest === null) {
            this.debug.error("[MssParser]", "Failed to parse manifest!!");
            return Q.when(null);
        }
        if (!manifest.hasOwnProperty("BaseURL")) {
            this.debug.log("[MssParser]", "Setting baseURL: " + baseUrl);
            manifest.BaseURL = baseUrl;
        } else {
            manifest.BaseURL = manifest.BaseURL_asArray && manifest.BaseURL_asArray[0] || manifest.BaseURL;
            if (manifest.BaseURL.indexOf("http") !== 0) {
                manifest.BaseURL = baseUrl + manifest.BaseURL;
            }
        }
        manifest = processManifest.call(this, manifest, start);
        mss2dash = new Date();
        this.debug.info("[MssParser]", "Parsing complete (xml2json: " + (json.getTime() - start.getTime()) + "ms, mss2dash: " + (mss2dash.getTime() - json.getTime()) + "ms, total: " + (new Date().getTime() - start.getTime()) / 1e3 + "s)");
        return Q.when(manifest);
    };
    return {
        debug: undefined,
        parse: internalParse
    };
};

Mss.dependencies.MssParser.prototype = {
    constructor: Mss.dependencies.MssParser
};