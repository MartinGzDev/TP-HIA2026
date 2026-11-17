// Capa de compatibilidad de consultas heredadas, implementada íntegramente sobre Sequelize/PostgreSQL.
// No utiliza Mongoose ni realiza conexiones a MongoDB.
const { Op } = require('sequelize');

function translateWhere(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const out = {};
  for (const [originalKey, value] of Object.entries(input)) {
    const key = originalKey === '_id' ? 'id' : originalKey;
    if (key === '$or') out[Op.or] = value.map(translateWhere);
    else if (key === '$and') out[Op.and] = value.map(translateWhere);
    else if (key === '$nor') out[Op.not] = { [Op.or]: value.map(translateWhere) };
    else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const operators = {};
      for (const [op, val] of Object.entries(value)) {
        const mapped = ({ $in: Op.in, $nin: Op.notIn, $gte: Op.gte, $gt: Op.gt, $lte: Op.lte, $lt: Op.lt, $ne: Op.ne, $eq: Op.eq, $not: Op.not })[op];
        if (mapped) operators[mapped] = val;
        else if (op === '$regex') operators[Op.iLike] = `%${String(val).replace(/^\^|\$$/g, '')}%`;
        else if (!op.startsWith('$')) operators[op] = val;
      }
      out[key] = Object.keys(operators).length ? operators : value;
    } else if (['productosAplicables', 'categoriasAplicables', 'productosIds'].includes(key) && value != null) {
      out[key] = { [Op.contains]: [value] };
    } else out[key] = value;
  }
  return out;
}

function translateUpdate(update = {}) {
  const out = {};
  for (const [key, value] of Object.entries(update)) {
    if (key === '$set') Object.assign(out, value);
    else if (key === '$inc') for (const [field, amount] of Object.entries(value)) out[field] = require('sequelize').literal(`"${field}" + (${Number(amount)})`);
    else if (key === '$unset') for (const field of Object.keys(value)) out[field] = null;
    else if (!key.startsWith('$')) out[key] = value;
  }
  return out;
}

function associationFor(Model, path) {
  return Object.values(Model.associations || {}).find(a => a.as === path || a.foreignKey === path || a.target.name.toLowerCase() === path.toLowerCase().replace(/id$/, ''));
}

function makeInclude(Model, path, fields, nested) {
  const association = associationFor(Model, path);
  if (!association) return null;
  const include = { model: association.target, as: association.as, required: false };
  const nestedIncludes = [];
  if (fields && typeof fields === 'string') {
    const requested = fields.split(/\s+/).filter(Boolean).map(x => x === '_id' ? 'id' : x);
    const positives = requested.filter(x => !x.startsWith('-'));
    const known = positives.filter(x => x === 'id' || association.target.rawAttributes[x]);
    const profileFields = positives.filter(x => !known.includes(x));
    if (known.length) include.attributes = known;
    else if (requested.some(x => x.startsWith('-'))) include.attributes = { exclude: requested.filter(x => x.startsWith('-')).map(x => x.slice(1)) };
    if (profileFields.length && association.target.associations?.usuario) {
      nestedIncludes.push({ model: association.target.associations.usuario.target, as: 'usuario', attributes: ['id', ...profileFields.filter(x => association.target.associations.usuario.target.rawAttributes[x])] });
    }
  }
  if (nested) {
    const nestedItems = Array.isArray(nested) ? nested : [nested];
    nestedIncludes.push(...nestedItems.map(item => makeInclude(association.target, item.path, item.select, item.populate)).filter(Boolean));
  }
  if (nestedIncludes.length) include.include = nestedIncludes;
  return include;
}

class LegacyQuery {
  constructor(Model, method, args = []) {
    this.Model = Model;
    this.method = method;
    this.args = args;
    this.options = {};
    this.includes = [];
    this.arrayPopulates = [];
    this.updateData = null;
  }
  populate(path, fields) {
    if (typeof path === 'object' && path) {
      const nested = path.populate;
      const inc = makeInclude(this.Model, path.path, path.select, nested);
      if (inc) this.includes.push(inc);
      else {
        const arrayTargets = {
          Oferta: { productosAplicables: { target: require('./producto') }, categoriasAplicables: { target: require('./categoria.model') }, productos: { target: require('./producto'), source: 'productosAplicables' } },
          Combo: { productosIds: { target: require('./producto') } }
        };
        const spec = arrayTargets[this.Model.name]?.[path.path];
        if (spec) this.arrayPopulates.push({ path: path.path, target: spec.target, source: spec.source || path.path, fields: path.select, nested: path.populate });
      }
    } else {
      const inc = makeInclude(this.Model, path, fields);
      if (inc) this.includes.push(inc);
      else {
        const arrayTargets = {
          Oferta: { productosAplicables: { target: require('./producto') }, categoriasAplicables: { target: require('./categoria.model') }, productos: { target: require('./producto'), source: 'productosAplicables' } },
          Combo: { productosIds: { target: require('./producto') } }
        };
        const spec = arrayTargets[this.Model.name]?.[path];
        if (spec) this.arrayPopulates.push({ path, target: spec.target, source: spec.source || path, fields, nested: undefined });
      }
    }
    return this;
  }
  sort(value) {
    let order = [];

    if (typeof value === 'string') {
      order = value.trim().split(/\s+/).filter(Boolean).map(field => {
        const descending = field.startsWith('-');
        const attribute = field.replace(/^[-+]/, '');

        return [attribute, descending ? 'DESC' : 'ASC'];
      });
    } else if (Array.isArray(value)) {
      order = value;
    } else if (value && typeof value === 'object') {
      order = Object.entries(value).map(([field, dir]) => [
        field,
        Number(dir) < 0 || String(dir).toLowerCase() === 'desc'
          ? 'DESC'
          : 'ASC'
      ]);
    }

    this.options.order = order;
    return this;
  }
  skip(value) { this.options.offset = Number(value) || 0; return this; }
  limit(value) { this.options.limit = Number(value) || undefined; return this; }
  select(value) {
    if (typeof value === 'string') {
      const fields = value.split(/\s+/).filter(Boolean);
      const excluded = fields.filter(x => x.startsWith('-')).map(x => x.slice(1));
      const included = fields.filter(x => !x.startsWith('-')).map(x => x === '_id' ? 'id' : x);
      if (included.length) this.options.attributes = included;
      else if (excluded.length) this.options.attributes = { exclude: excluded };
    }
    return this;
  }
  lean() { return this; }
  async exec() {
    const opts = { ...this.options };
    if (this.includes.length) opts.include = this.includes;
    const [kind, arg] = [this.method, this.args[0]];
    let result;
    if (kind === 'find') result = await this.Model.findAll({ ...opts, where: translateWhere(arg) });
    else if (kind === 'findOne') result = await this.Model.findOne({ ...opts, where: translateWhere(arg) });
    else if (kind === 'findById') result = await this.Model.findByPk(arg, opts);
    else if (kind === 'findByIdAndUpdate') {
      result = await this.Model.findByPk(arg, opts);
      if (result) await result.update(translateUpdate(this.args[1]), { validate: this.args[2]?.runValidators !== false });
    } else if (kind === 'findByIdAndDelete') {
      result = await this.Model.findByPk(arg, opts);
      if (result) await result.destroy();
    } else if (kind === 'findOneAndUpdate') {
      result = await this.Model.findOne({ ...opts, where: translateWhere(arg) });
      if (result) await result.update(translateUpdate(this.args[1]));
    }
    if (this.arrayPopulates.length && result) {
      const rows = Array.isArray(result) ? result : [result];
      for (const row of rows) {
        for (const spec of this.arrayPopulates) {
          const ids = row.get(spec.source) || [];
          const attrs = typeof spec.fields === 'string' ? spec.fields.split(/\s+/).filter(Boolean) : undefined;
          const include = spec.nested ? makeInclude(spec.target, spec.nested.path, spec.nested.select, spec.nested.populate) : null;
          const docs = await spec.target.findAll({ where: { id: ids }, ...(attrs?.length ? { attributes: attrs } : {}), ...(include ? { include: [include] } : {}) });
          row.setDataValue(spec.path, docs);
        }
      }
    }
    return result;
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
  finally(callback) { return this.exec().finally(callback); }
}

function installLegacyCompat(Model) {
  if (Model.__legacyCompatInstalled) return;
  Model.__legacyCompatInstalled = true;
  const originalFindOne = Model.findOne.bind(Model);
  Model.findOne = function (options = {}) {
    if (options && (Object.prototype.hasOwnProperty.call(options, 'where') || options.include || options.transaction || options.attributes || options.order)) return originalFindOne(options);
    return new LegacyQuery(Model, 'findOne', [options]);
  };
  Model.find = function (query = {}) { return new LegacyQuery(Model, 'find', [query]); };
  Model.findById = function (id) { return new LegacyQuery(Model, 'findById', [id]); };
  Model.findByIdAndUpdate = function (id, update, options = {}) { return new LegacyQuery(Model, 'findByIdAndUpdate', [id, update, options]); };
  Model.findByIdAndDelete = function (id) { return new LegacyQuery(Model, 'findByIdAndDelete', [id]); };
  Model.findOneAndUpdate = function (query, update, options = {}) { return new LegacyQuery(Model, 'findOneAndUpdate', [query, update, options]); };
  Model.countDocuments = function (query = {}) { return Model.count({ where: translateWhere(query) }); };
  // Equivalente Sequelize para las llamadas heredadas Model.deleteOne({ ... }).
  Model.deleteOne = async function (query = {}, options = {}) {
    const where = translateWhere(query);
    const deletedCount = await Model.destroy({ where, ...options });
    return { acknowledged: true, deletedCount };
  };
  const originalCreate = Model.create.bind(Model);
  Model.create = function (values, options) { return originalCreate(values, options); };
  const proto = Model.prototype;
  if (!Object.getOwnPropertyDescriptor(proto, '_id')) Object.defineProperty(proto, '_id', { get() { return this.id; }, set(value) { this.id = value; } });
  // Compatibilidad de serialización: Sequelize usa get({ plain: true }), no toObject().
  if (!proto.toObject) proto.toObject = function () { return this.get({ plain: true }); };
  if (!proto.deleteOne) proto.deleteOne = function (options) { return this.destroy(options); };
  const originalToJSON = proto.toJSON;
  proto.toJSON = function () {
    const result = originalToJSON.call(this);
    result._id = this.id;
    if (this.usuario) {
      for (const field of ['nombre', 'apellido', 'email', 'telefono', 'username']) {
        if (this.usuario[field] !== undefined) result[field] = this.usuario[field];
      }
    }
    return result;
  };
}

module.exports = { installLegacyCompat, translateWhere, translateUpdate };
