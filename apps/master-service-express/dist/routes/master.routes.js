"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const master_controller_1 = require("../controllers/master.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Protected endpoints
router.get('/:table', auth_1.authenticate, master_controller_1.list);
router.get('/:table/:id', auth_1.authenticate, master_controller_1.getOne);
router.post('/:table', auth_1.authenticate, master_controller_1.create);
router.put('/:table/:id', auth_1.authenticate, master_controller_1.update);
router.delete('/:table/:id', auth_1.authenticate, master_controller_1.remove);
exports.default = router;
