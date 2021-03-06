const { insert, list, loginUser, modify, remove } = require("../services/Users");
const projectService = require("../services/Projects");
const httpStatus = require("http-status");
const { passwordToHash, generateAccessToken, generateRefreshToken } = require("../scripts/utils/helper");
const uuid = require("uuid");
const eventEmitter = require("../scripts/events/eventEmitter");
const path = require("path");

const create = (req, res) => {
    req.body.password = passwordToHash(req.body.password);
    insert(req.body)
        .then((response) => {
            res.status(httpStatus.CREATED).send(response);
        })
        .catch((e) => {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e);
        });
};

const login = (req, res) => {
    req.body.password = passwordToHash(req.body.password);
    loginUser(req.body)
        .then((user) => {
            if (!user)
                return res.status(httpStatus.NOT_FOUND).send({ message: "the user not found" })
            user = {
                ...user.toObject(),
                tokens: {
                    access_token: generateAccessToken(user),
                    refresh_token: generateRefreshToken(user)
                },
            };
            delete user.password;
            res.status(httpStatus.OK).send(user);
        })
        .catch((e) => { res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e) })
}

const index = (req, res) => {
    list()
        .then((response) => {
            res.status(httpStatus.OK).send(response);
        })
        .catch((e) => {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send(e)
        });
};

const projectsList = (req, res) => {
    projectService.list({ user_id : req.user?._id}).then((projects) => {
        res.status(httpStatus.OK).send(projects)
    })
    .catch(() => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
        error: "an unexpected error occurred while fetching projects"
    }))
}

const resetPassword = (req, res) => {
    const new_password = uuid.v4()?.split("-")[0] || new Date().getTime();
    modify({ email: req.body.email }, { password: passwordToHash(new_password) }).then((updatedUser) => {
        if(!updatedUser) return res.status(httpStatus.NOT_FOUND).send({ error : "there isn't any such user"})
        
        eventEmitter.emit("send_email", {
            to: updatedUser.email,
            subject: "Reset Password",
            html: "Your password has been reset<br />your new password:"+new_password,
        });
        
        res.status(httpStatus.OK).send({
            message: "We have sent your new password to your email, please check it."
        });
    }).catch(() => {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send("an error occurred while resetting the password")
    });
}

const update = (req, res) => {
    modify({ _id: req.user?._id }, req.body).then((updatedUser) => {
        res.status(httpStatus.OK).send(updatedUser)
    }).catch(() => {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: "a problem occurred during update"})
    })
}

const changePassword = (req, res) => {
    req.body.password = passwordToHash(req.body.password);
    modify({ _id: req.user?._id }, req.body).then((updatedUser) => {
        res.status(httpStatus.OK).send(updatedUser)
    }).catch(() => {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: "a problem occurred during cahnge"})
    })
}

const deleteUser = (req, res) => {
    if(!req.params.id) {
        return res.status(httpStatus.BAD_REQUEST).send({
            message : "haven't find ID info"
        });
    }
    remove(req.params?.id).then((deletedUser) => {
        if(!deletedUser){
            return res.status(httpStatus.NOT_FOUND).send({
                message: "no such user was found"
            })
        }
        res.status(httpStatus.OK).send({
            message: "the user has been deleted"
        })
    }).catch((e) => { res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error : "a problem occurred during deletion process" }) })
}

const updateProfileImage = (req, res) => {
    if(!req?.files?.profile_image) {
        return res.status(httpStatus.BAD_REQUEST).send({
            error: "you haven't selected any file"
        })
    }
    //upload file
    const extention = path.extname(req.files.profile_image.name);
    const fileName = req?.user._id+extention;
    const folderPath = path.join(__dirname, "../", "uploads/users", fileName);
    req.files.profile_image.mv(folderPath, function(err) {
        if(err) {
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
                error: err
            })
        }
        modify({ _id: req.user._id}, { profile_image: fileName }).then((updatedUser) => {
            res.status(httpStatus.OK).send(updatedUser)
        }).catch((e) => {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
                error: "a problem occurred during update"
            })
        })
    })
}

module.exports = {
    create,
    index,
    login,
    projectsList,
    resetPassword,
    update,
    deleteUser,
    changePassword,
    updateProfileImage
}