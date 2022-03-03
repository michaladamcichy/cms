const { Sequelize, DataTypes, TableHints, STRING} = require('sequelize');

const sequelize = new Sequelize('shop', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
  });

const Task = sequelize.define(
    'task', {
        task: {
            type: DataTypes.STRING,
            allowNull: false
        },
        completed: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        }
    }
);

const Product = sequelize.define(
    'product', {
        name: {
            type: DataTypes.STRING,
            defaultValue: "product's name...",
        },
        image: {
            type: DataTypes.STRING,
            defaultValue: 'static/pig.jpg', //alert
        },
        price: {
            type: DataTypes.DECIMAL(10,2),
            defaultValue: '0.00',
        },
        quantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        tags: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    }
);

const Title = sequelize.define(
    'title', {
        index: {
            type: DataTypes.INTEGER,
        },
        text: {
            type: DataTypes.STRING,
        }
    }
);

const Paragraph = sequelize.define(
    'paragraph', {
        index: {
            type: DataTypes.INTEGER,
        },
        text: {
            type: DataTypes.TEXT('long'),
        }
    }
);

const Image = sequelize.define(
    'image', {
        index: {
            type: DataTypes.INTEGER,
        },
        uri: {
            type: DataTypes.STRING,
        }
    }
);

const getAllLayoutComponents = async (productId) => {
    try {
        const whereClause = {where: {productId}};
        const titles = (await Title.findAll(whereClause)).map(item => {item.dataValues.type = 'title'; return item.dataValues;});
        const paragraphs = (await Paragraph.findAll(whereClause)).map(item => {item.dataValues.type = 'paragraph'; return item.dataValues;});
        const images = (await Image.findAll(whereClause)).map(item => {item.dataValues.type = 'image'; return item.dataValues});

        const layoutComponents =  titles.concat(paragraphs).concat(images);
        //console.log(layoutComponents);
        const sorted = layoutComponents.sort((x, y) => x.index - y.index);
        //console.log(sorted);

        return layoutComponents;
    } catch(error) {
        //////console.log(error);
        return;
    }
};

const deleteAllLayoutComponents = async (productId) => {
    const clause = {where: {productId}, truncate: true};
    Title.destroy(clause);
    Paragraph.destroy(clause);
    Image.destroy(clause);
    
    
    // const titles = await Title.findAll(whereClause);
    // const paragraphs = await Paragraph.findAll(whereClause);
    // const images = await Image.findAll(whereClause);

    // titles.destroy();
    // paragraphs.destroy();
    // images.destroy();
    //////console.log('layout components destroyed');
};

// Title.belongsTo(Product, {foreignKey: 'productId'});
// Paragraph.belongsTo(Product, {foreignKey: 'productId'});
// Image.belongsTo(Product, {foreignKey: 'productId'});

Product.hasMany(Title);
Product.hasMany(Paragraph);
Product.hasMany(Image);

Product.sync();
Title.sync();
Paragraph.sync();
Image.sync();

// Product.sync({force: true});
// Title.sync({force: true});
// Paragraph.sync({force: true});
// Image.sync({force: true});


const express = require('express');
const app = express();
const port = 4000;
const bp = require('body-parser')
const session = require('express-session');

app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))
app.use(session({
	secret: '1234abc1234abcdwxyz1234',
    genid: function(req) {
        return (new Date()).getTime() // alert
      },
	resave: true,
	saveUninitialized: true
}));


const cors = require('cors');
const { request } = require('express');



// const multer = require('multer');  
// var storage =   multer.diskStorage({  
//     destination: function (req, file, callback) {  
//       callback(null, './uploads');  
//     },  
//     filename: function (req, file, callback) {  
//       callback(null, file.originalname);  
//     }  
//   });  
//   var upload = multer({ storage : storage}).single('myfile');  


const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
    methods: "GET, PUT, POST, PATCH, DELETE",    
}
app.use(cors(corsOptions));

const fileUpload = require('express-fileupload');
app.use(fileUpload({
    createParentPath: true,
  }));

const error = res => {
    return res.json({status: 'error'});
};

const removeAllLayoutComponents = async  id => {
    await Title.destroy({where: {productId: id}});
    await Paragraph.destroy({where: {productId: id}});
    await Image.destroy({where: {productId: id}});
};

const isAdmin = async req => {
    //return true; //alert!!!
    console.log(req.headers);
    if(req.headers.cookiecookie) {
       const [key, value] = req.headers.cookiecookie.split('=');
       const password = value; //alert
       if(password == 'abc') {
           req.session.admin = true;
       }
    }
    return req.session.admin === true;
};

app.route('/product')
    .get(async (req, res) => {
        console.log(req.session);

        const params = req.query;
        if(!params.id) {
            try {
                if(isAdmin(req)) {
                    console.log('admin');
                    const products = await Product.findAll();
                    return res.json({status: 'ok', data: products});
                } else {
                    const products = await Product.findAll({where: {isActive: true}});
                    return res.json({status: 'ok', data: products});
                }
                
            } catch(e) {
                //////console.log(e);
                return error(res);
            }
        }
        
        let product;
        try {
            product = await Product.findByPk(params.id);
        } catch(e) {
            //////console.log(e);
            return error(res);
        }

        if(!product) {
            //////console.log('product not found');
            return error(res);
        }

        const layoutComponents = await getAllLayoutComponents(params.id);

        if(!layoutComponents) {
            //////console.log('cannot fetch layoutComponents');
            return error(res);
        }
        console.log(product.dataValues);
        return res.json({status: 'ok', ...product.dataValues, layoutComponents});
    })
    .put(async (req, res) => {
        if(!await await isAdmin(req)) {
            return error(res);
        }

        const product = req.body;
        console.log('here');
        console.log(product);
        const oldProduct = await Product.findByPk(product.id);

        if(!oldProduct) {
            return res.json({status: 'error'});
        }

        const newProduct = await oldProduct.update(product);

        if(!newProduct) {
            return res.json({status: 'error'});
        }
        
        await removeAllLayoutComponents(product.id);
        console.log('layoutComponent');
        console.log(product.id);
        product.layoutComponents = product.layoutComponents.map((item, index) => { return {...item, index, productId: product.id};}); //alert
        
        console.log('image');
        const image = product.layoutComponents.find(item => item.type == 'image');
        console.log(image);

        for(let i = 0; i < product.layoutComponents.length; i++) {
            ////console.log('here');
            const layoutComponent = product.layoutComponents[i];

            let model;
            if(layoutComponent.type == 'title') {
                model = Title;
            } else if(layoutComponent.type == 'paragraph') {
                model = Paragraph;
            } else if(layoutComponent.type == 'image') {
                model = Image;
            }

            if(model) {
                // delete layoutComponent.type;
                ////console.log(layoutComponent);
                await model.create(layoutComponent);
            }
        }
        res.json({status: 'ok'});
    })
    .post(async (req, res) => {
        if(!await isAdmin(req)) {
            return error(res);
        }

        const product = await Product.create();
        if(product) {
            //////console.log(product);
            res.json({status: 'ok', id: product.id});
        } else {
            //////console.log('cannot add');
            res.json({status: 'error'});
        }
    })
    .delete(async (req, res) => {
        if(!await isAdmin(req)) {
            return error(res);
        }

        const params = req.query;
        if(params.id && params.id > 0) {
            const product = await Product.findByPk(params.id);
            if(product) {
                await deleteAllLayoutComponents(params.id);
                product.destroy().then(() => {
                    Product.findAll()
                        .then(products => {res.json(products);})
                        .catch(error => res.json({status: 'error'})); 
                }).catch(error => {
                    res.json({status: 'error'});
                });
            } else {
                res.json({status: 'error'});
            }
        } else {
            res.json({status: 'error'});
        } 
    });
app.route('/login')
    .post(async (req, res) => {
        // console.log(req.body);
        if(req.body.password == 'abc') { //alert!!!
            req.session.admin = true;
            res.json({status: 'ok', cookie: req.sessionID});
        } else {
            res.json({status: 'error'});
        }
    })
    .get(async (req, res) => {
        req.session.admin = false;
    });

app.route('/quantity')
    .post(async (req, res) => {
        if(!await isAdmin(req)) {
            return error(res);
        }
        
        if(!req.body) return error(res); 

        const id = req.body.id;
        const quantity = req.body.quantity;

        const product = await Product.findByPk(id);
        if(!product) return error(res);

        const newQuantity = parseInt(quantity) + product.quantity;
        
        if(product) {
            const p = await product.update({...product, quantity: Math.max(0, newQuantity)});
            if(!p) return error(res);
        }

        return res.json({quantity: newQuantity});
    });

app.route('/image')
    .post((req, res) => {
        console.log(req.files);
        if(req.files && req.files.file) {
            const file = req.files.file;
            const fileName = file.name;
            file.mv(`./shop/static/${fileName}`, error => {
                console.log(error);
            }); //alert
            // return 200;
            // res.json({status: 'ok'});
        } else {
            // error(res);
        }
        // upload(req,res,function(err) {  
        //     if(err) {  
        //         return res.end("Error uploading file.");  
        //     }  
        //     res.end("File is uploaded successfully!");  
        // });  

        // console.log(req.body);
        // res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
        // return res.json({status: 'ok'});
    });

app.listen(port, () => {
    //////console.log('Server running');
});
