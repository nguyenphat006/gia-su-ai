// Sinh bởi khung i18n: mỗi namespace một tệp (làm song song không đụng nhau). Thêm namespace -> thêm dòng import.
import common from "./common.json";
import validation from "./validation.json";
import meta from "./meta.json";
import layout from "./layout.json";
import list from "./list.json";
import detail from "./detail.json";
import form from "./form.json";
import auth from "./auth.json";
import errors from "./errors.json";
import dashboard from "./dashboard.json";
import users from "./users.json";
import settings from "./settings.json";
import auditLogs from "./auditLogs.json";
import profile from "./profile.json";
import units from "./units.json";
import materialCategories from "./materialCategories.json";
import materials from "./materials.json";
import attachments from "./attachments.json";
import dataTransfer from "./dataTransfer.json";
import numberFormat from "./numberFormat.json";
import notifications from "./notifications.json";
import customers from "./customers.json";
import suppliers from "./suppliers.json";

const messages = { common, validation, meta, layout, list, detail, form, auth, errors, dashboard, users, settings, auditLogs, profile, units, materialCategories, materials, attachments, dataTransfer, numberFormat, notifications, customers, suppliers };
export default messages;
