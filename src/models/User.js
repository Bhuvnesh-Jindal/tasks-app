const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Task = require('./Task')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        default: 0,
        validate(value) {
            if (value < 0) {
                throw new Error('Enter a valid age')
            }
        }
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        required: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Enter a valid Email')
            }
        }
    },
    pwd: {
        type: String,
        required: true,
        minLength: 8,
        validate(value) {
            if (value.toLowerCase().includes('password')) {
                throw new Error('Password can\'t be "password"')
            }
        }

    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
})

userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.methods.generateToken = async function() {
    const token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET)
    this.tokens = this.tokens.concat({ token })
    await this.save()
    return token
}

userSchema.methods.toJSON = function() {
    const userObj = this.toObject()

    delete userObj.pwd
    delete userObj.tokens

    return userObj
}

userSchema.statics.findByCred = async function(email, pwd) {
    const user = await User.findOne({ email })
    if (!user) {
        throw new Error('No such User Exist')
    }
    const isMatch = await bcrypt.compare(pwd, user.pwd)
    if (!isMatch) {
        throw new Error('Invalid Password')
    }
    return user
}

userSchema.pre('save', async function(next) {
    if (this.isModified('pwd')) {
        this.pwd = await bcrypt.hash(this.pwd, 8)
    }
    next()
})

userSchema.pre('remove', async function(next) {
    await Task.deleteMany({ owner: this._id })
    next()
})

const User = mongoose.model('User', userSchema)

module.exports = User