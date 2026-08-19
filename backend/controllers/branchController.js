import Branch from '../models/Branch.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';

export const getBranches = catchAsync(async (_req, res) => {
  const branches = await Branch.find({ isActive: true }).select('name classes.name sections').lean();

  res.status(200).json({
    success: true,
    data: branches.map((b) => ({
      name: b.name,
      classes: b.classes.map((c) => c.name),
      sections: b.sections || ['S1', 'S2', 'S3', 'S4'],
    })),
    meta: null,
    message: 'Branches retrieved successfully',
  });
});

export const getClasses = catchAsync(async (req, res) => {
  const { name } = req.params;
  const branch = await Branch.findOne({ name, isActive: true }).lean();

  if (!branch) {
    throw new ApiError('Branch not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: branch.classes.map((c) => c.name),
    meta: null,
    message: 'Classes retrieved successfully',
  });
});

export const getSubjects = catchAsync(async (req, res) => {
  const { name, className } = req.params;
  const branch = await Branch.findOne({ name, isActive: true }).lean();

  if (!branch) {
    throw new ApiError('Branch not found', 404, 'NOT_FOUND');
  }

  const classObj = branch.classes.find((c) => c.name === className);
  if (!classObj) {
    throw new ApiError('Class not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: classObj.subjects,
    meta: null,
    message: 'Subjects retrieved successfully',
  });
});
