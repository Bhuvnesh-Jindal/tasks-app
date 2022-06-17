const express = require('express')
const Task = require('../models/Task')
const router = new express.Router()
const auth = require('../middleware/auth')

router.post('/tasks', auth, async(req, res) => {
    const task = new Task({
        ...req.body,
        owner: req.user._id
    })

    try {
        await task.save()
        res.status(201).send(task)
    } catch (error) {
        res.status(400).send(error)
    }
})

router.get('/tasks', auth, async(req, res) => {
    const match = {}
    const sort = {}

    if (req.query.completed) {
        match.completed = req.query.completed === 'true'
    }
    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }
    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        })
        res.send(req.user.tasks)
    } catch (error) {
        res.status(500).send(error)
    }
})

router.get('/tasks/:id', async(req, res) => {
    const _id = req.params.id
    try {
        const result = await Task.findOne({ _id, owner: req.user._id })
        if (!result) {
            return res.status(404).send()
        }
        res.status(200).send(result)
    } catch (error) {
        res.status(500).send(error)
    }
})

router.patch('/tasks/:id', auth, async(req, res) => {
    const updates = Object.keys(req.body)
    const allowed = ['description', 'completed']
    const isValid = updates.every((update) => allowed.includes(update))
    if (!isValid) {
        return res.status(400).send({ error: 'Invaid Updates' })
    }
    try {
        const result = await Task.findOne({ _id: req.params.id, owner: req.user._id })
        if (!result) {
            return res.status(404).send()
        }
        updates.forEach((update) => result[update] = req.body[update])
        await result.save()
        res.send(result)
    } catch (error) {
        res.status(500).send()
    }
})

router.delete('/tasks/:id', auth, async(req, res) => {
    try {
        const result = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
        if (!result) {
            return res.status(404).send()
        }
        res.send(result)
    } catch (error) {
        res.status(500).send()
    }
})

module.exports = router