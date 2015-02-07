/*
Copyright (C) 2014  PencilBlue, LLC

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
* Index page of the Jennifer theme
*/

function Index(){};

//dependencies
var TopMenu        = require(path.join(DOCUMENT_ROOT, '/include/theme/top_menu'));
var Media          = require(path.join(DOCUMENT_ROOT, '/include/theme/media'));
var ArticleService = require(path.join(DOCUMENT_ROOT, '/include/service/entities/article_service')).ArticleService;

//inheritance
util.inherits(Index, pb.BaseController);

Index.prototype.onArticle = function(cb) {
    var self = this;

    try {
        pb.DAO.getObjectID(this.pathVars.customUrl);
    }
    catch(e) {
        var dao = new pb.DAO();
        dao.loadByValues({url: self.pathVars.customUrl}, 'article', function(err, article) {
            if (util.isError(err) || article == null) {
                self.reqHandler.serve404();
                return;
            }

            self.article = article._id.toString();
            self.renderPage(cb);
        });
        return;
    }

    self.article = self.pathVars.customUrl;
    self.renderPage(cb);
};

Index.prototype.onPage = function(cb) {
    var self = this;

    try {
        pb.DAO.getObjectID(this.pathVars.customUrl);
    }
    catch(e) {
        var dao = new pb.DAO();
        dao.loadByValues({url: self.pathVars.customUrl}, 'page', function(err, page) {
            if (util.isError(err) || page == null) {
                self.reqHandler.serve404();
                return;
            }

            self.page = page._id.toString();
            self.renderPage(cb);
        });
        return;
    }

    self.page = self.pathVars.customUrl;
    self.renderPage(cb);
};

Index.prototype.onSection = function(cb) {
    var self = this;

    try {
        pb.DAO.getObjectID(this.pathVars.customUrl);
    }
    catch(e) {
        var dao = new pb.DAO();
        dao.loadByValues({url: self.pathVars.customUrl}, 'section', function(err, section) {
            if (util.isError(err) || section == null) {
                self.reqHandler.serve404();
                return;
            }

            self.section = section._id.toString();
            self.renderPage(cb);
        });
        return;
    }

    self.section = self.pathVars.customUrl;
    self.renderPage(cb);
};

Index.prototype.onTopic = function(cb) {
    var self = this;

    try {
        pb.DAO.getObjectID(this.pathVars.customUrl);
    }
    catch(e) {
        var dao = new pb.DAO();
        dao.loadByValues({name: self.pathVars.customUrl}, 'topic', function(err, topic) {
            if (util.isError(err) || topic == null) {

            }

            self.topic = topic._id.toString();
            self.renderPage(cb);
        });
        return;
    }

    self.topic = self.pathVars.customUrl;
    self.renderPage(cb);
};

Index.prototype.renderPage = function(cb) {
    var self = this;

    //determine and execute the proper call
    var section = self.section || null;
    var topic   = self.topic   || null;
    var article = self.article || null;
    var page    = self.page    || null;

    pb.content.getSettings(function(err, contentSettings) {
        self.gatherData(function(err, data) {
            ArticleService.getMetaInfo(data.content[0], function(metaKeywords, metaDescription, metaTitle, metaThumbnail) {
                self.ts.registerLocal('meta_keywords', metaKeywords);
                self.ts.registerLocal('meta_desc', metaDescription);
                self.ts.registerLocal('meta_title', metaTitle);
                self.ts.registerLocal('meta_lang', localizationLanguage);
                self.ts.registerLocal('meta_thumbnail', metaThumbnail);
                self.ts.registerLocal('current_url', self.req.url);
                self.ts.registerLocal('navigation', new pb.TemplateValue(data.nav.navigation, false));
                self.ts.registerLocal('account_buttons', new pb.TemplateValue(data.nav.accountButtons, false));
                self.ts.registerLocal('infinite_scroll', function(flag, cb) {
                    if(self.article || self.page) {
                        cb(null, '');
                    }
                    else {
                        var infiniteScrollScript = pb.js.includeJS('/js/infinite_article_scroll.js');
                        if(section) {
                            infiniteScrollScript += pb.js.getJSTag('var infiniteScrollSection = "' + section + '";');
                        }
                        else if(topic) {
                            infiniteScrollScript += pb.js.getJSTag('var infiniteScrollTopic = "' + topic + '";');
                        }

                        var val = new pb.TemplateValue(infiniteScrollScript, false);
                        cb(null, val);
                    }
                });
                self.ts.registerLocal('articles', function(flag, cb) {
                    var tasks = pb.utils.getTasks(data.content, function(content, i) {
                        return function(callback) {
                            if (i >= contentSettings.articles_per_page) {//TODO, limit articles in query, not through hackery
                                callback(null, '');
                                return;
                            }
                            self.renderContent(content[i], contentSettings, data.nav.themeSettings, i, callback);
                        };
                    });
                    async.parallel(tasks, function(err, result) {
                        cb(err, new pb.TemplateValue(result.join(''), false));
                    });
                });
                self.ts.registerLocal('page_name', function(flag, cb) {
                    var content = data.content.length > 0 ? data.content[0] : null;
                    self.getContentSpecificPageName(content, cb);
                });
                self.ts.registerLocal('angular', function(flag, cb) {
                    self.getHeroImage(article || page, data.content[0], function(err, heroImage) {
                        var objects = {
                            topics: data.topics,
                            heroImage: heroImage,
                            isPage: page !== null
                        };
                        var angularData = pb.js.getAngularController(objects, ['ngSanitize']);
                        cb(null, angularData);
                    });
                });
                self.ts.load('index', function(err, result) {
                    if (util.isError(err)) {
                        throw err;
                    }

                    cb({content: result});
                });
            });
        });
    });
}

Index.prototype.gatherData = function(cb) {
    var self  = this;
    var tasks = {
        //navigation
        nav: function(callback) {
            self.getNavigation(function(themeSettings, navigation, accountButtons) {
                callback(null, {themeSettings: themeSettings, navigation: navigation, accountButtons: accountButtons});
            });
        },

        //articles, pages, etc.
        content: function(callback) {
            self.loadContent(callback);
        },

        topics: function(callback) {
            var dao = new pb.DAO();
            dao.q('topic', callback);
        }
    };
    async.parallel(tasks, cb);
};

Index.prototype.loadContent = function(articleCallback) {
    var section = this.section || null;
    var topic   = this.topic   || null;
    var article = this.article || null;
    var page    = this.page    || null;

    var service = new ArticleService();
    if(this.req.pencilblue_preview) {
        if(this.req.pencilblue_preview == page || article) {
            if(page) {
                service.setContentType('page');
            }
            var where = pb.DAO.getIDWhere(page || article);
            where.draft = {$exists: true};
            where.publish_date = {$exists: true};
            service.find(where, articleCallback);
        }
        else {
            service.find({}, articleCallback);
        }
    }
    else if(section) {
        service.findBySection(section, articleCallback);
    }
    else if(topic) {
        service.findByTopic(topic, articleCallback);
    }
    else if(article) {
        service.findById(article, articleCallback);
    }
    else if(page) {
        service.setContentType('page');
        service.findById(page, articleCallback);
    }
    else{
        service.find({}, articleCallback);
    }
};

Index.prototype.getNavigation = function(cb) {
    var options = {
        currUrl: this.req.url
    };
    TopMenu.getTopMenu(this.session, this.ls, options, function(themeSettings, navigation, accountButtons) {
        TopMenu.getBootstrapNav(navigation, accountButtons, function(navigation, accountButtons) {
            cb(themeSettings, navigation, accountButtons);
        });
    });
};

Index.prototype.renderContent = function(content, contentSettings, themeSettings, index, cb) {
    var self = this;

    var isPage           = content.object_type === 'page';
    var showByLine       = contentSettings.display_bylines && !isPage;
    var showTimestamp    = contentSettings.display_timestamp && !isPage;
    var ats              = new pb.TemplateService(this.ls);
    var contentUrlPrefix = isPage ? '/page/' : '/article/';
    self.ts.reprocess = false;
    ats.registerLocal('article_permalink', pb.UrlService.urlJoin(pb.config.siteRoot, contentUrlPrefix, content.url));
    ats.registerLocal('article_headline', new pb.TemplateValue('<a href="' + pb.UrlService.urlJoin(contentUrlPrefix, content.url) + '">' + content.headline + '</a>', false));
    ats.registerLocal('article_headline_nolink', content.headline);
    ats.registerLocal('article_subheading', content.subheading ? content.subheading : '');
    ats.registerLocal('article_subheading_display', content.subheading ? '' : 'display:none;');
    ats.registerLocal('article_id', content._id.toString());
    ats.registerLocal('article_index', index);
    ats.registerLocal('article_timestamp', showTimestamp && content.timestamp ? content.timestamp : '');
    ats.registerLocal('article_timestamp_display', showTimestamp ? '' : 'display:none;');
    ats.registerLocal('article_layout', new pb.TemplateValue(content.layout, false));
    ats.registerLocal('article_url', content.url);
    ats.registerLocal('display_byline', showByLine ? '' : 'display:none;');
    ats.registerLocal('author_photo', content.author_photo ? content.author_photo : '');
    ats.registerLocal('author_photo_display', content.author_photo ? '' : 'display:none;');
    ats.registerLocal('author_name', content.author_name ? content.author_name : '');
    ats.registerLocal('author_position', content.author_position ? content.author_position : '');
    ats.registerLocal('media_body_style', content.media_body_style ? content.media_body_style : '');
    ats.registerLocal('comments', function(flag, cb) {
        if (isPage || !contentSettings.allow_comments) {
            cb(null, '');
            return;
        }

        self.renderComments(content, ats, function(err, comments) {
            cb(err, new pb.TemplateValue(comments, false));
        });
    });
    ats.load('elements/article', cb);
};

Index.prototype.renderComments = function(content, ts, cb) {
    var self           = this;
    var commentingUser = null;
    if(pb.security.isAuthenticated(this.session)) {
        commentingUser = Comments.getCommentingUser(this.session.authentication.user);
    }

    ts.registerLocal('user_photo', function(flag, cb) {
        if (commentingUser) {
            cb(null, commentingUser.photo ? commentingUser.photo : '');
        }
        else {
            cb(null, '');
        }
    });
    ts.registerLocal('user_position', function(flag, cb) {
        if (commentingUser && util.isArray(commentingUser.position) && commentingUser.position.length > 0) {
            cb(null, ', ' + commentingUser.position);
        }
        else {
            cb(null, '');
        }
    });
    ts.registerLocal('user_name', commentingUser ? commentingUser.name : '');
    ts.registerLocal('display_submit', commentingUser ? 'block' : 'none');
    ts.registerLocal('display_login', commentingUser ? 'none' : 'block');
    ts.registerLocal('comments_length', util.isArray(content.comments) ? content.comments.length : 0);
    ts.registerLocal('individual_comments', function(flag, cb) {
        if (!util.isArray(content.comments) || content.comments.length == 0) {
            cb(null, '');
            return;
        }

        var tasks = pb.utils.getTasks(content.comments, function(comments, i) {
            return function(callback) {
                self.renderComment(comments[i], callback);
            };
        });
        async.parallel(tasks, function(err, results) {
            cb(err, new pb.TemplateValue(results.join(''), false));
        });
    });
    ts.load('elements/comments', cb);
};

Index.prototype.getHeroImage = function(individualItem, content, cb) {
    var defaultHero = '/public/jennifer/img/hero.jpg'

    if(!content) {
        cb(null, defaultHero);
        return;
    }

    var self = this;
    var dao = new pb.DAO();

    var mediaId = '';
    if(content.article_media) {
        mediaId = content.article_media[0];
    }
    else {
        mediaId = content.page_media[0];
    }

    if(typeof mediaId === 'undefined') {
        cb(null, defaultHero);
        return;
    }

    dao.loadById(mediaId, 'media', function(err, media) {
        if(util.isError(err)) {
            cb(err, media);
            return;
        }

        cb(null, media.location);
    });
};

Index.prototype.getContentSpecificPageName = function(content, cb) {
    if (!content) {
        cb(null, pb.config.siteName);
        return;
    }

    if(this.req.pencilblue_article || this.req.pencilblue_page) {
        cb(null, content.headline + ' | ' + pb.config.siteName);
    }
    else if(this.req.pencilblue_section || this.req.pencilblue_topic) {

        var objType = this.req.pencilblue_section ? 'section' : 'topic';
        var dao     = new pb.DAO();
        dao.loadById(this.req.pencilblue_section, objType, function(err, obj) {
            if(util.isError(err) || obj === null) {
                cb(null, pb.config.siteName);
                return;
            }

            cb(null, obj.name + ' | ' + pb.config.siteName);
        });
    }
    else {
        cb(null, pb.config.siteName);
    }
};

/**
* Provides the routes that are to be handled by an instance of this prototype.
* The route provides a definition of path, permissions, authentication, and
* expected content type.
* Method is optional
* Path is required
* Permissions are optional
* Access levels are optional
* Content type is optional
*
* @param cb A callback of the form: cb(error, array of objects)
*/
Index.getRoutes = function(cb) {
    var routes = [{
        method: 'get',
        path: '/',
        auth_required: false,
        handler: 'renderPage',
        content_type: 'text/html'
    }, {
        method: 'get',
        path: '/article/:customUrl',
        auth_required: false,
        handler: 'onArticle',
        content_type: 'text/html'
    }, {
        method: 'get',
        path: '/page/:customUrl',
        auth_required: false,
        handler: 'onPage',
        content_type: 'text/html'
    }, {
        method: 'get',
        path: '/section/:customUrl',
        auth_required: false,
        handler: 'onSection',
        content_type: 'text/html'
    }, {
        method: 'get',
        path: '/topic/:customUrl',
        auth_required: false,
        handler: 'onTopic',
        content_type: 'text/html'
    }];
    cb(null, routes);
};

//exports
module.exports = Index;
