"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getOne = exports.list = void 0;
const masterService_1 = require("../services/masterService");
const response_1 = require("../utils/response");
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { table } = req.params;
    const data = yield (0, masterService_1.listMasters)(table);
    res.json((0, response_1.success)(data));
});
exports.list = list;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { table, id } = req.params;
    const data = yield (0, masterService_1.getMaster)(table, Number(id));
    res.json((0, response_1.success)(data));
});
exports.getOne = getOne;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { table } = req.params;
    const created = yield (0, masterService_1.createMaster)(table, req.body);
    res.status(201).json((0, response_1.success)(created));
});
exports.create = create;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { table, id } = req.params;
    const updated = yield (0, masterService_1.updateMaster)(table, Number(id), req.body);
    res.json((0, response_1.success)(updated));
});
exports.update = update;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { table, id } = req.params;
    try {
        const deleted = yield (0, masterService_1.deleteMaster)(table, Number(id));
        res.json((0, response_1.success)(deleted));
    }
    catch (err) {
        res.status(400).json({ success: false, error: { message: err.message } });
    }
});
exports.remove = remove;
