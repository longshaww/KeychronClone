const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const product = require("./routers/product.router");
var session = require("express-session");
const DataBase = require("./Control/dataBase"),
	User = require("./Control/UserControl");
const { DH_UNABLE_TO_CHECK_GENERATOR } = require("constants");

const app = express(),
	dbUser = new User(),
	db = new DataBase(),
	host = process.env.PORT || 3000;
let usersAccount = dbUser.getUserAccount(),
	userInfo = dbUser.getUserInfo();

var cookie = {
	name: "user",
	resave: true,
	saveUninitialized: true,
	secret: "somesecret",
	cookie: { maxAge: 24 * 60 * 60 * 1000 },
};

app.set("trust proxy", 1);
app.set("views", "./assets/view");
app.set("view engine", "pug");

app.use(express.json());
app.use(session(cookie));
app.use("/product", product);
app.use(express.static("assets"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
	res.render("index", {
		title: "KeyChron",
		scripts: ["./js/HOME.js"],
		styles: [],
	});
});

app.get("/data", async (req, res) => {
	res.json(await db.getData());
});

app.get("/data/slide", async (req, res) => {});

app.get("/ShowCase", function (req, res) {
	res.render("index", {
		title: "Buyers' Showcase",
		scripts: ["./js/buyShowCase.js"],
		styles: ["./css/showcase.css"],
	});
});

app.get("/CheckOut", function (req, res) {
	res.render("checkout");
});

app.route("/products/:product")
	.get(async (req, res) => {
		var productName = [],
			params = req.params.product.split("-");
		for (var i = 0; i < params.length; i++) {
			productName.push(
				params[i][0].toUpperCase() + params[i].slice(1)
			);
		}
		productName = productName.join(" ");
		res.render("product", {
			title: productName,
			scripts: ["../js/product.js"],
			styles: ["../css/product.css"],
		});
	})
	.post(async (req, res) => {
		res.json(await db.findProduct(req.params.product));
	});

app.get("/data/user/:id", async (req, res) => {
	return usersAccount.length > req.params.id
		? res.send(usersAccount[req.params.id])
		: res.send("Not Found User ID");
});

app.get("/test", (req, res) => {
	res.sendFile(path.join(__dirname, "/assets/view/index.html"));
});

app.route("/account")
	.get((req, res) => {
		if (!req.session.user)
			res.render("index", {
				title: "Account",
				scripts: ["./js/LOGIN.js"],
				styles: ["./css/login.css"],
			});
		else
			res.render("index", {
				title: `Account - ${req.session.user.name}`,
				scripts: ["./js/profile.js"],
				styles: ["./css/profile.css"],
			});
	})
	.post(async (req, res) => {
		let data = req.body,
			response = {};
		if (!req.session.user) {
			const user = usersAccount.find((i) => i.email == data.email);
			if (data.submit === "Sign in") {
				if (user && user.pass == data.pass) {
					req.session.user = userInfo.find(
						(i) => i.id == user.id
					);
					response.success = true;
				} else
					response = {
						success: false,
						msg: "Incorrect email or password.",
					};
			} else if (data.submit == "Create") {
				if (
					data.firstName &&
					data.lastName &&
					data.email &&
					data.pass &&
					!user
				) {
					await dbUser.addUser({
						email: data.email,
						firstName: data.firstName,
						lastName: data.lastName,
						pass: data.pass,
					});
					usersAccount = dbUser.getUserAccount();
					userInfo = dbUser.getUserInfo();
					response = {
						success: true,
						msg: "Create account failed.",
					};
				} else
					response = {
						success: false,
						msg: "Email has been registered.",
					};
			} else if (data.submit == "Submit") {
				if (user)
					response = {
						success: true,
						verify: true,
						msg:
							"We've sent you an email with a link to update your password.",
					};
				else
					response = {
						success: false,
						verify: false,
						msg: "Email hasn't been registered",
					};
				res.status(302);
			}
		}
		res.send(response);
	});

app.post("/saveInfo", async (req, res) => {
	if (req.session.user) {
		const id = req.session.user.id;
		dbUser.EditUser(id, req.body);
		return res.send(true);
	}

	res.send(false);
});

app.get("/info", (req, res) => {
	res.json(req.session.user);
});

app.post("/data", async (req, res) => {
	const user = req.body;
	if (user.user && user.name && user.email && user.pass)
		await db.addUser({
			user: user.user,
			pass: user.pass,
			name: user.name,
			email: user.email,
		});
	else return res.send("Wrong info");
	res.send("oki");
});

app.get("/signout", async (req, res) => {
	req.session.destroy();
	// res.send("oki");
	res.redirect("/account");
});

app.listen(host, function () {
	console.log(`server running is http://localhost:${host}`);
});
