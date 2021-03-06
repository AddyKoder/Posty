import p from 'path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import express from 'express';
export const router = express();

import * as user from './database/userDB.js';
import * as post from './database/postDB.js';

const urlencoded = express.urlencoded({ extended: true });
let jsonparser = express.json();
import cparser from 'cookie-parser';
router.use(cparser());
router.set('view engine', 'pug');
router.set('views', p.join(__dirname, '../FRONTEND/'));
// static pages serving

router.get('/', (req, res) => {
	res.redirect('/login');
});

router.get('/feed', (req, res) => {
	res.sendFile(p.join(__dirname, '../FRONTEND/post-feed.html'));
});

router.get('/login', urlencoded, async (req, res) => {
	if ((req.cookies.username_mail, req.cookies.pwd)) {
		let username_mail = req.cookies.username_mail;
		let password = req.cookies.pwd;

		if (await user.verify_login(username_mail, password)) {
			res.cookie('username_mail', username_mail, {
				maxAge: 1000 * 60 * 60 * 24,
			});
			res.cookie('pwd', password, {
				maxAge: 1000 * 60 * 60 * 24,
			});
			res.redirect('/profile');
		} else {
			res.cookie('pwd', '');
			res.cookie('username_mail', '');
			res.redirect('/login');
		}
	} else {
		res.header('Content-Type', 'text/html');
		res.sendFile(p.join(__dirname, '../FRONTEND/home.html'));
	}
});

router.get('/signup', (req, res) => {
	res.header('Content-Type', 'text/html');
	res.sendFile(p.join(__dirname, '../FRONTEND/signup.html'));
});

router.get('/profile', (req, res) => {
	res.header('Content-Type', 'text/html');
	res.sendFile(p.join(__dirname, '../FRONTEND/user-profile.html'));
});

router.get('/add-post', (req, res) => {
	res.header('Content-Type', 'text/html');
	res.sendFile(p.join(__dirname, '../FRONTEND/add-post.html'));
});

// endpoints for the backend
router.post('/signup', urlencoded, async (req, res) => {
	if (!(await user.verify_user_data(req.body.name, req.body.mail, req.body.uername, req.body.password, req.body.confirm_password))) {
		res.render('error', {
			title: 'Incorrect Information',
			description: 'Due to a client side error the server is projected with falsy information. \n Try again, if problem continues, then contact our help team at help@posty.com',
		});
		return false;
	}

	if (user.createUser(req.body.name, req.body.mail, req.body.username, req.body.password)) {
		res.redirect('/');
	}
});

router.post('/login', urlencoded, async (req, res) => {
	let password = req.body.password;
	let username_mail = req.body.username_email;

	if (await user.verify_login(username_mail, password, false)) {
		res.cookie('username_mail', username_mail, {
			maxAge: 1000 * 60 * 60 * 24,
		});
		res.cookie('pwd', password, {
			maxAge: 1000 * 60 * 60 * 24,
		});
		res.redirect('/profile');
	} else res.redirect('/login');
});

router.get('/verify_login', async (req, res) => {
	let info = req.query.info;
	let pwd = req.query.pwd;
	if (info && pwd) {
		if (await user.verify_login(info, pwd)) {
			res.send('true');
		} else res.send('false');
	} else res.send('false');
});

router.get('/get_user_info', async (req, res) => {
	let info = req.query.info;

	if (info) {
		let user_info = await user.get_user_info(info);
		if (user_info) res.send(JSON.stringify(user_info));
		return;
	}
	res.send('false');
});

router.post('/add-post', jsonparser, async (req, res) => {
	let data = req.body;
	let info = data.username_mail;
	let pwd = data.pwd;
	let title = data.title;
	let content = data.content;

	if (info && pwd) {
		if (await user.verify_login(info, pwd)) {
			if (await user.add_post(info, { title, content })) {
				res.send('ok');
				return;
			}
		}
	}
	res.send('error');
});

router.get('/get-post', async (req, res) => {
	let postID = req.query.id;
	if (!postID) {
		res.send('error');
		return;
	}
	let data = await post.get_post(postID);
	if (data) {
		res.send(JSON.stringify(data));
		return;
	}
	res.send('error');
});

router.get('/user/:username', async (req, res) => {
	let user_data = await user.get_user_info(req.params.username);
	if (user_data) {
		res.render('user-page', { username: user_data.username });
	} else
		res.render('error', {
			title: 'User not found',
			description: 'The user you are trying to find is not available in our database, Please recheck the username or contact our help mail',
		});
});

router.get('/all-posts', async (req, res) => {
	res.send(JSON.stringify(await post.get_all_post_ids()));
});

router.get('/posts/:id', async (req, res) => {
	let post_data = await post.get_post(req.params.id);
	let user_data = await user.get_user(post_data.author);
	if (post_data) res.render('see-post', { author: user_data.username, title: post_data.title, content: post_data.content });
	else res.render('error', {
		title: 'No such post in our database',
		description: 'The post you are trying to find is not available in our database, Please recheck the location or contact our help mail',
	});
});
